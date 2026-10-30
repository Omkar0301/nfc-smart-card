import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signAccessToken } from '../../src/services/token.service.js';
import * as s3Lib from '../../src/lib/s3.js';
import { Role, UserStatus } from '@nfc-card/shared';

function uploadRequest(
  baseUrl: string,
  endpoint: string,
  token?: string,
  file?: { name: string; filename: string; contentType: string; buffer: Buffer },
  fields?: Record<string, string>
) {
  const boundary = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`;
  const parts: Buffer[] = [];

  if (fields) {
    for (const [key, val] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
        )
      );
    }
  }

  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const payload = Buffer.concat(parts);

  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>(
    (resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': payload.length,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 500,
                headers: res.headers,
                body: data ? JSON.parse(data) : {},
              });
            } catch {
              resolve({
                status: res.statusCode || 500,
                headers: res.headers,
                body: { raw: data },
              });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    }
  );
}

describe('File Upload Integration Tests (F-016)', () => {
  let server: Server;
  let baseUrl: string;

  const testSuffix = Math.floor(Math.random() * 100000);
  let customerUser: any;
  let adminUser: any;
  let customerToken: string;
  let adminToken: string;
  let testTemplate: any;
  let testCardType: any;

  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;

    // Create test customer & admin
    customerUser = await prisma.user.create({
      data: {
        name: `Customer ${testSuffix}`,
        phone: `+1998${testSuffix.toString().padStart(7, '0')}`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: `Admin ${testSuffix}`,
        phone: `+1997${testSuffix.toString().padStart(7, '0')}`,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    customerToken = signAccessToken(customerUser.id, Role.CUSTOMER);
    adminToken = signAccessToken(adminUser.id, Role.ADMIN);

    // Create card type and template for thumbnail tests
    testCardType = await prisma.cardType.create({
      data: {
        name: `Test Upload Type ${testSuffix}`,
        slug: `upload-type-${testSuffix}`,
        fieldSchema: [],
        cardNumberPrefix: `UT${testSuffix.toString().slice(-4)}`,
      },
    });

    testTemplate = await prisma.template.create({
      data: {
        cardTypeId: testCardType.id,
        name: 'Test Template',
        slug: `test-tpl-${testSuffix}`,
        isActive: true,
        isPremium: false,
        sortOrder: 1,
        configuration: {},
      },
    });
  });

  afterAll(async () => {
    try {
      if (testTemplate?.id) {
        await prisma.template.deleteMany({ where: { id: testTemplate.id } });
      }
      if (testCardType?.id) {
        await prisma.cardType.deleteMany({ where: { id: testCardType.id } });
      }
      if (customerUser?.id) {
        await prisma.user.deleteMany({ where: { id: customerUser.id } });
      }
      if (adminUser?.id) {
        await prisma.user.deleteMany({ where: { id: adminUser.id } });
      }
    } catch {
      // ignore cleanup errors
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('POST /upload/profile-photo rejects unauthenticated request with 401', async () => {
    const res = await uploadRequest(baseUrl, '/upload/profile-photo', undefined, {
      name: 'file',
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
      buffer: validJpeg,
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('POST /upload/profile-photo returns 400 when no file is uploaded', async () => {
    const res = await uploadRequest(baseUrl, '/upload/profile-photo', customerToken);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('NO_FILE');
  });

  it('POST /upload/profile-photo returns 415 when uploaded file has invalid magic bytes', async () => {
    const fakeFile = Buffer.from('this is not an image');
    const res = await uploadRequest(baseUrl, '/upload/profile-photo', customerToken, {
      name: 'file',
      filename: 'photo.jpg',
      contentType: 'image/jpeg', // Fake client header
      buffer: fakeFile,
    });

    expect(res.status).toBe(415);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_FILE_TYPE');
  });

  it('POST /upload/profile-photo succeeds with valid JPEG image', async () => {
    vi.spyOn(s3Lib, 'uploadFile').mockResolvedValueOnce(
      'https://cdn.example.com/profiles/user/test.jpg'
    );

    const res = await uploadRequest(baseUrl, '/upload/profile-photo', customerToken, {
      name: 'file',
      filename: 'avatar.jpg',
      contentType: 'image/jpeg',
      buffer: validJpeg,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.url).toBe('https://cdn.example.com/profiles/user/test.jpg');
  });

  it('POST /upload/template-thumbnail rejects non-admin requests with 403', async () => {
    const res = await uploadRequest(
      baseUrl,
      '/upload/template-thumbnail',
      customerToken, // customer token, not admin
      {
        name: 'file',
        filename: 'thumb.png',
        contentType: 'image/png',
        buffer: validPng,
      },
      { templateId: testTemplate.id }
    );

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('FORBIDDEN');
  });

  it('POST /upload/template-thumbnail requires templateId in form data', async () => {
    const res = await uploadRequest(baseUrl, '/upload/template-thumbnail', adminToken, {
      name: 'file',
      filename: 'thumb.png',
      contentType: 'image/png',
      buffer: validPng,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /upload/template-thumbnail succeeds for admin with valid templateId', async () => {
    vi.spyOn(s3Lib, 'uploadFile').mockResolvedValueOnce(
      'https://cdn.example.com/templates/tpl/thumb.png'
    );

    const res = await uploadRequest(
      baseUrl,
      '/upload/template-thumbnail',
      adminToken,
      {
        name: 'file',
        filename: 'thumb.png',
        contentType: 'image/png',
        buffer: validPng,
      },
      { templateId: testTemplate.id }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.url).toBe('https://cdn.example.com/templates/tpl/thumb.png');

    // Verify DB update
    const updated = await prisma.template.findUnique({ where: { id: testTemplate.id } });
    expect(updated?.thumbnail).toBe('https://cdn.example.com/templates/tpl/thumb.png');
  });
});
