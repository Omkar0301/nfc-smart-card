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

const get = (baseUrl: string, endpoint: string, token?: string) =>
  requestHelper(baseUrl, 'GET', endpoint, undefined, token);
const post = (baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) =>
  requestHelper(baseUrl, 'POST', endpoint, body, token);
const put = (baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) =>
  requestHelper(baseUrl, 'PUT', endpoint, body, token);
const del = (baseUrl: string, endpoint: string, token?: string) =>
  requestHelper(baseUrl, 'DELETE', endpoint, undefined, token);

describe('Template System Integration Tests (F-009)', () => {
  let server: Server;
  let baseUrl: string;

  let adminUserId: string;
  let customerUserId: string;
  let adminToken: string;
  let customerToken: string;

  let testCardTypeId: string;
  let fixtureTemplateId: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const testCardTypeSlug = `test-templates-${randomSuffix}`;
  const fixtureSlug = `fixture-${randomSuffix}`;
  const createSlug = `created-${randomSuffix}`;

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;

    const adminUser = await prisma.user.create({
      data: {
        name: 'Templates Test Admin',
        phone: `+1777${randomSuffix}`,
        email: `tpl_admin_${randomSuffix}@example.com`,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminUserId = adminUser.id;
    adminToken = signAccessToken(adminUserId, Role.ADMIN);

    const customerUser = await prisma.user.create({
      data: {
        name: 'Templates Test Customer',
        phone: `+1666${randomSuffix}`,
        email: `tpl_customer_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customerUserId = customerUser.id;
    customerToken = signAccessToken(customerUserId, Role.CUSTOMER);

    const cardType = await prisma.cardType.create({
      data: {
        name: 'Templates Test Type',
        slug: testCardTypeSlug,
        cardNumberPrefix: `T${String(randomSuffix).slice(0, 6)}`,
        fieldSchema: [
          { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
        ] as any,
        status: 'ACTIVE',
      },
    });
    testCardTypeId = cardType.id;

    // Inactive fixture used for admin mutation tests (kept out of the public list).
    const fixture = await prisma.template.create({
      data: {
        cardTypeId: testCardTypeId,
        name: 'Fixture',
        slug: fixtureSlug,
        isActive: false,
        isPremium: false,
        sortOrder: 1,
        configuration: {},
      },
    });
    fixtureTemplateId = fixture.id;
  });

  afterAll(async () => {
    await prisma.template.deleteMany({ where: { cardTypeId: testCardTypeId } });
    await prisma.cardType.deleteMany({ where: { id: testCardTypeId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminUserId, customerUserId] } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('GET /templates (public)', () => {
    it('returns 400 when cardType is missing', async () => {
      const res = await get(baseUrl, '/templates');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown card type', async () => {
      const res = await get(baseUrl, '/templates?cardType=does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CARD_TYPE_NOT_FOUND');
    });

    it('returns the 3 seeded Business templates ordered by sortOrder', async () => {
      const res = await get(baseUrl, '/templates?cardType=business');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const templates = res.body.data.templates as any[];
      const slugs = templates.map((t) => t.slug);
      expect(slugs).toContain('business-modern');
      expect(slugs).toContain('business-minimal');
      expect(slugs).toContain('business-premium');
      expect(templates.every((t) => t.isActive)).toBe(true);

      const orders = templates.map((t) => t.sortOrder);
      expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    });

    it('excludes inactive templates from the public listing', async () => {
      const res = await get(baseUrl, `/templates?cardType=${testCardTypeSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.templates).toEqual([]);
    });
  });

  describe('GET /admin/templates', () => {
    it('returns 401 without a token', async () => {
      const res = await get(baseUrl, '/admin/templates');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 for a non-admin customer', async () => {
      const res = await get(baseUrl, '/admin/templates', customerToken);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns all templates (including inactive) for an admin', async () => {
      const res = await get(baseUrl, '/admin/templates', adminToken);
      expect(res.status).toBe(200);
      const ids = (res.body.data.templates as any[]).map((t) => t.id);
      expect(ids).toContain(fixtureTemplateId);
    });
  });

  describe('POST /admin/templates', () => {
    it('returns 400 for an invalid slug', async () => {
      const res = await post(
        baseUrl,
        '/admin/templates',
        { cardTypeId: testCardTypeId, name: 'Bad', slug: 'Not A Slug' },
        adminToken
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 when the slug already exists for the card type', async () => {
      const res = await post(
        baseUrl,
        '/admin/templates',
        { cardTypeId: testCardTypeId, name: 'Duplicate', slug: fixtureSlug },
        adminToken
      );
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TEMPLATE_SLUG_EXISTS');
    });

    it('creates a template for an admin', async () => {
      const res = await post(
        baseUrl,
        '/admin/templates',
        {
          cardTypeId: testCardTypeId,
          name: 'Created',
          slug: createSlug,
          isPremium: true,
          sortOrder: 4,
          configuration: { description: 'Created in a test' },
        },
        adminToken
      );
      expect(res.status).toBe(201);
      expect(res.body.data.template.slug).toBe(createSlug);
      expect(res.body.data.template.isPremium).toBe(true);
      expect(res.body.data.template.cardTypeSlug).toBe(testCardTypeSlug);
    });
  });

  describe('PUT /admin/templates/:id', () => {
    it('returns 404 for a non-existent template', async () => {
      const res = await put(
        baseUrl,
        '/admin/templates/does-not-exist',
        { isActive: true },
        adminToken
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('activates a template and exposes it on the public listing', async () => {
      const res = await put(
        baseUrl,
        `/admin/templates/${fixtureTemplateId}`,
        { isActive: true, sortOrder: 9 },
        adminToken
      );
      expect(res.status).toBe(200);
      expect(res.body.data.template.isActive).toBe(true);
      expect(res.body.data.template.sortOrder).toBe(9);

      const publicRes = await get(baseUrl, `/templates?cardType=${testCardTypeSlug}`);
      const slugs = (publicRes.body.data.templates as any[]).map((t) => t.slug);
      expect(slugs).toContain(fixtureSlug);
      expect(slugs).toContain(createSlug);
    });
  });

  describe('DELETE /admin/templates/:id', () => {
    it('returns 404 for a non-existent template', async () => {
      const res = await del(baseUrl, '/admin/templates/does-not-exist', adminToken);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TEMPLATE_NOT_FOUND');
    });

    it('hard-deletes a template that no profile references', async () => {
      const listRes = await get(baseUrl, '/admin/templates', adminToken);
      const created = (listRes.body.data.templates as any[]).find((t) => t.slug === createSlug);
      expect(created).toBeDefined();

      const res = await del(baseUrl, `/admin/templates/${created.id}`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.deactivated).toBe(false);

      const after = await prisma.template.findUnique({ where: { id: created.id } });
      expect(after).toBeNull();
    });
  });
});
