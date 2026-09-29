import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signAccessToken } from '../../src/services/token.service.js';
import { CardStatus, Role, UserStatus } from '@nfc-card/shared';

function requestHelper(
  baseUrl: string,
  method: string,
  endpoint: string,
  body?: Record<string, any>,
  token?: string
) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>(
    (resolve, reject) => {
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
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    }
  );
}

function get(baseUrl: string, endpoint: string, token?: string) {
  return requestHelper(baseUrl, 'GET', endpoint, undefined, token);
}

function post(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'POST', endpoint, body, token);
}

describe('Bulk Card Generation & Management Integration Tests (F-005)', () => {
  let server: Server;
  let baseUrl: string;

  let adminUserId: string;
  let customerUserId: string;
  let adminToken: string;
  let customerToken: string;
  let testCardTypeId: string;

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

    // Create test card type
    const ct = await prisma.cardType.create({
      data: {
        name: 'Test Card Type',
        slug: `test-card-${randomSuffix}`,
        cardNumberPrefix: `TC${String(randomSuffix).slice(0, 4)}`,
        fieldSchema: [
          { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
        ],
        status: 'ACTIVE',
      },
    });
    testCardTypeId = ct.id;
  });

  afterAll(async () => {
    // Clean up created records
    await prisma.nFCCard.deleteMany({
      where: { cardTypeId: testCardTypeId },
    });
    await prisma.generationJob.deleteMany({
      where: { cardTypeId: testCardTypeId },
    });
    await prisma.cardType.deleteMany({
      where: { id: testCardTypeId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, customerUserId] } },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects POST /admin/cards/generate without auth (401)', async () => {
    const res = await post(baseUrl, '/admin/cards/generate', {
      cardTypeId: testCardTypeId,
      quantity: 10,
    });
    expect(res.status).toBe(401);
  });

  it('rejects POST /admin/cards/generate with customer auth (403)', async () => {
    const res = await post(
      baseUrl,
      '/admin/cards/generate',
      {
        cardTypeId: testCardTypeId,
        quantity: 10,
      },
      customerToken
    );
    expect(res.status).toBe(403);
  });

  it('rejects invalid quantity (400 INVALID_QUANTITY)', async () => {
    const res = await post(
      baseUrl,
      '/admin/cards/generate',
      {
        cardTypeId: testCardTypeId,
        quantity: 0,
      },
      adminToken
    );
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('INVALID_QUANTITY');
  });

  it('rejects non-existent card type (404 CARD_TYPE_NOT_FOUND)', async () => {
    const res = await post(
      baseUrl,
      '/admin/cards/generate',
      {
        cardTypeId: 'non-existent-cuid',
        quantity: 10,
      },
      adminToken
    );
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('CARD_TYPE_NOT_FOUND');
  });

  let createdJobId: string;
  let createdBatchId: string;

  it('enqueues generation job successfully (202 Accepted)', async () => {
    const res = await post(
      baseUrl,
      '/admin/cards/generate',
      {
        cardTypeId: testCardTypeId,
        quantity: 10,
      },
      adminToken
    );
    expect(res.status).toBe(202);
    expect(res.body.data?.jobId).toBeDefined();
    expect(res.body.data?.batchId).toBeDefined();
    createdJobId = res.body.data.jobId;
    createdBatchId = res.body.data.batchId;
  });

  it('fetches job status via GET /admin/jobs/:id (200)', async () => {
    const res = await get(baseUrl, `/admin/jobs/${createdJobId}`, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data?.job?.id).toBe(createdJobId);
    expect(res.body.data?.job?.batchId).toBe(createdBatchId);
    expect(res.body.data?.job?.quantity).toBe(10);
  });

  it('fetches job status via GET /admin/cards/jobs/:id (200)', async () => {
    const res = await get(baseUrl, `/admin/cards/jobs/${createdJobId}`, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data?.job?.id).toBe(createdJobId);
  });

  it('returns 404 for unknown job ID', async () => {
    const res = await get(baseUrl, '/admin/jobs/unknown-cuid', adminToken);
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('JOB_NOT_FOUND');
  });

  it('invalidates defective batch via POST /admin/cards/batches/:batchId/invalidate', async () => {
    const testBatchId = `test-batch-${randomSuffix}`;
    // Insert dummy cards in this batch: 2 AVAILABLE, 1 ASSIGNED
    await prisma.nFCCard.createMany({
      data: [
        {
          cardNumber: `TC-DUMMY-1-${randomSuffix}`,
          publicToken: `token-avail-1-${randomSuffix}`,
          cardTypeId: testCardTypeId,
          batchId: testBatchId,
          status: CardStatus.AVAILABLE,
        },
        {
          cardNumber: `TC-DUMMY-2-${randomSuffix}`,
          publicToken: `token-avail-2-${randomSuffix}`,
          cardTypeId: testCardTypeId,
          batchId: testBatchId,
          status: CardStatus.AVAILABLE,
        },
        {
          cardNumber: `TC-DUMMY-3-${randomSuffix}`,
          publicToken: `token-assigned-3-${randomSuffix}`,
          cardTypeId: testCardTypeId,
          batchId: testBatchId,
          status: CardStatus.ASSIGNED,
        },
      ],
    });

    const res = await post(
      baseUrl,
      `/admin/cards/batches/${testBatchId}/invalidate`,
      {},
      adminToken
    );
    expect(res.status).toBe(200);
    expect(res.body.data?.invalidated).toBe(2);
    expect(res.body.data?.skipped).toBe(1);

    // Verify in DB that AVAILABLE cards became DEACTIVATED and ASSIGNED remained untouched
    const deactivatedCards = await prisma.nFCCard.findMany({
      where: { batchId: testBatchId, status: CardStatus.DEACTIVATED },
    });
    expect(deactivatedCards).toHaveLength(2);

    const assignedCard = await prisma.nFCCard.findFirst({
      where: { batchId: testBatchId, status: CardStatus.ASSIGNED },
    });
    expect(assignedCard).not.toBeNull();
  });

  it('returns 404 when invalidating non-existent batch', async () => {
    const res = await post(
      baseUrl,
      '/admin/cards/batches/non-existent-batch/invalidate',
      {},
      adminToken
    );
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('BATCH_NOT_FOUND');
  });

  it('exports cards to CSV via GET /admin/cards/export', async () => {
    const res = await get(baseUrl, `/admin/cards/export?cardTypeId=${testCardTypeId}`, adminToken);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('cards-export.csv');
    expect(res.body.raw).toContain('Card Number,Card Type,NFC URL,Status');
  });
});
