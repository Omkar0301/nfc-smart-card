import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signAccessToken } from '../../src/services/token.service.js';
import { Role, UserStatus } from '@nfc-card/shared';

function requestHelper(
  baseUrl: string,
  method: string,
  endpoint: string,
  body?: Record<string, any>,
  token?: string
) {
  return new Promise<{ status: number; body: Record<string, any> }>((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: data ? JSON.parse(data) : {} });
          } catch {
            resolve({ status: res.statusCode || 500, body: { raw: data } });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function get(baseUrl: string, endpoint: string, token?: string) {
  return requestHelper(baseUrl, 'GET', endpoint, undefined, token);
}

function post(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'POST', endpoint, body, token);
}

function put(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'PUT', endpoint, body, token);
}

describe('CardType & Field Schema Integration Tests (F-004)', () => {
  let server: Server;
  let baseUrl: string;

  let adminUserId: string;
  let customerUserId: string;
  let adminToken: string;
  let customerToken: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;

    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        phone: `+1999${randomSuffix}`,
        email: `admin_${randomSuffix}@example.com`,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    adminToken = signAccessToken(adminUserId, Role.ADMIN);

    // Create test customer user
    const customerUser = await prisma.user.create({
      data: {
        name: 'Test Customer',
        phone: `+1888${randomSuffix}`,
        email: `customer_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customerUserId = customerUser.id;
    customerToken = signAccessToken(customerUserId, Role.CUSTOMER);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, customerUserId] } },
    });
    // Clean up any created test card types
    await prisma.cardType.deleteMany({
      where: { slug: { startsWith: `test-doctor-${randomSuffix}` } },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('GET /admin/card-types', () => {
    it('returns 401 when no token provided', async () => {
      const res = await get(baseUrl, '/admin/card-types');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when user is not admin', async () => {
      const res = await get(baseUrl, '/admin/card-types', customerToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 and list of card types for admin', async () => {
      const res = await get(baseUrl, '/admin/card-types', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.cardTypes)).toBe(true);

      const slugs = res.body.data.cardTypes.map((c: any) => c.slug);
      expect(slugs).toContain('business');
      expect(slugs).toContain('college');
    });
  });

  describe('POST /admin/card-types', () => {
    it('returns 403 for non-admin', async () => {
      const res = await post(
        baseUrl,
        '/admin/card-types',
        {
          name: 'Forbidden Test',
          slug: `test-forbidden-${randomSuffix}`,
          fieldSchema: [
            { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
          ],
        },
        customerToken
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 409 when slug already exists', async () => {
      const res = await post(
        baseUrl,
        '/admin/card-types',
        {
          name: 'Business Duplicate',
          slug: 'business',
          fieldSchema: [
            { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
          ],
        },
        adminToken
      );
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLUG_EXISTS');
    });

    it('returns 400 when slug format is invalid', async () => {
      const res = await post(
        baseUrl,
        '/admin/card-types',
        {
          name: 'Invalid Slug',
          slug: 'Doctor Type!',
          fieldSchema: [
            { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
          ],
        },
        adminToken
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when duplicate keys exist in fieldSchema', async () => {
      const res = await post(
        baseUrl,
        '/admin/card-types',
        {
          name: 'Duplicate Keys',
          slug: `test-duplicate-${randomSuffix}`,
          fieldSchema: [
            { key: 'phone', label: 'Phone', type: 'phone', required: false, defaultVisible: true },
            {
              key: 'phone',
              label: 'Second Phone',
              type: 'phone',
              required: false,
              defaultVisible: true,
            },
          ],
        },
        adminToken
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a new CardType when input is valid', async () => {
      const newSlug = `test-doctor-${randomSuffix}`;
      const res = await post(
        baseUrl,
        '/admin/card-types',
        {
          name: 'Doctor Profile',
          slug: newSlug,
          description: 'Specialized card for doctors and specialists',
          fieldSchema: [
            { key: 'name', label: 'Full Name', type: 'text', required: true, defaultVisible: true },
            {
              key: 'specialty',
              label: 'Specialty',
              type: 'text',
              required: true,
              defaultVisible: true,
            },
            {
              key: 'hospital',
              label: 'Hospital / Clinic',
              type: 'text',
              required: false,
              defaultVisible: true,
            },
            {
              key: 'reg_number',
              label: 'Medical Reg. Number',
              type: 'text',
              required: false,
              defaultVisible: false,
            },
          ],
        },
        adminToken
      );

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cardType.slug).toBe(newSlug);
      expect(res.body.data.cardType.name).toBe('Doctor Profile');
      expect(res.body.data.cardType.fieldSchema).toHaveLength(4);
    });
  });

  describe('GET /admin/card-types/:id and PUT /admin/card-types/:id', () => {
    it('returns 404 for non-existent card type id', async () => {
      const res = await get(baseUrl, '/admin/card-types/non-existent-cuid', adminToken);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('updates card type name and description successfully', async () => {
      const allRes = await get(baseUrl, '/admin/card-types', adminToken);
      const businessType = allRes.body.data.cardTypes.find((c: any) => c.slug === 'business');
      expect(businessType).toBeDefined();

      const updateRes = await put(
        baseUrl,
        `/admin/card-types/${businessType.id}`,
        {
          name: 'Business Card Pro',
          description: 'Updated description for business cards',
        },
        adminToken
      );

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.cardType.name).toBe('Business Card Pro');
      expect(updateRes.body.data.cardType.description).toBe(
        'Updated description for business cards'
      );

      // Revert name back for consistency
      await put(
        baseUrl,
        `/admin/card-types/${businessType.id}`,
        {
          name: 'Business Card',
          description:
            'Professional digital business card for founders, executives, and freelancers',
        },
        adminToken
      );
    });
  });
});
