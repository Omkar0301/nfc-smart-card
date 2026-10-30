import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signAccessToken } from '../../src/services/token.service.js';
import { CardStatus, ErrorCode, Role, UserStatus } from '@nfc-card/shared';

function requestHelper(
  baseUrl: string,
  method: string,
  endpoint: string,
  body?: Record<string, any>,
  headers?: Record<string, string>
) {
  return new Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: any;
  }>((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(postData
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData).toString(),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let jsonBody: any = null;
          try {
            jsonBody = JSON.parse(data);
          } catch {
            // not json
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: jsonBody,
          });
        });
      }
    );
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('Analytics & Telemetry Integration Tests (F-014)', () => {
  let server: Server;
  let baseUrl: string;

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const activeToken = `tok-active-analyt-${testSuffix}`;
  const pausedToken = `tok-paused-analyt-${testSuffix}`;

  let activeCardId: string;
  let pausedCardId: string;
  let cardTypeId: string;
  let customerId: string;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    // 1. Create Card Type
    const ct = await prisma.cardType.create({
      data: {
        name: `Analytics Test Type ${testSuffix}`,
        slug: `analytics-test-${testSuffix}`,
        cardNumberPrefix: `AN${testSuffix.toString().slice(0, 3)}`,
        fieldSchema: [],
      },
    });
    cardTypeId = ct.id;

    // 2. Create Customer User & Card Assignment
    const user = await prisma.user.create({
      data: {
        name: 'Jane Doe',
        phone: `+1800${testSuffix}`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customerId = user.id;
    customerToken = signAccessToken(user.id, Role.CUSTOMER);

    // 3. Create Admin User
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        phone: `+1811${testSuffix}`,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminToken = signAccessToken(admin.id, Role.ADMIN);

    // 4. Create Active Card & Assign
    const activeCard = await prisma.nFCCard.create({
      data: {
        cardNumber: `AN-ACT-${testSuffix}`,
        publicToken: activeToken,
        cardTypeId,
        status: CardStatus.ACTIVE,
      },
    });
    activeCardId = activeCard.id;

    await prisma.cardAssignment.create({
      data: {
        cardId: activeCard.id,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    // 5. Create Paused Card
    const pausedCard = await prisma.nFCCard.create({
      data: {
        cardNumber: `AN-PSD-${testSuffix}`,
        publicToken: pausedToken,
        cardTypeId,
        status: CardStatus.PAUSED,
      },
    });
    pausedCardId = pausedCard.id;
  });

  afterAll(async () => {
    await prisma.profileEvent.deleteMany({
      where: {
        cardId: { in: [activeCardId, pausedCardId] },
      },
    });
    await prisma.cardAssignment.deleteMany({
      where: {
        cardId: { in: [activeCardId, pausedCardId] },
      },
    });
    await prisma.nFCCard.deleteMany({
      where: {
        id: { in: [activeCardId, pausedCardId] },
      },
    });
    await prisma.cardType.deleteMany({
      where: { id: cardTypeId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customerId] } },
    });

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('records PROFILE_VIEW via POST /analytics/event for an ACTIVE card', async () => {
    const res = await requestHelper(baseUrl, 'POST', '/analytics/event', {
      cardToken: activeToken,
      eventType: 'PROFILE_VIEW',
      metadata: { visitorId: `vid-${testSuffix}-1` },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded).toBe(true);
    expect(res.body.data.isBot).toBe(false);
  });

  it('records interaction event via POST /analytics/events alias', async () => {
    const res = await requestHelper(baseUrl, 'POST', '/analytics/events', {
      cardToken: activeToken,
      eventType: 'PHONE_CLICK',
      metadata: { target: 'tel:+1234567890' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded).toBe(true);
  });

  it('detects search bot User-Agent and sets isBot = true', async () => {
    const res = await requestHelper(
      baseUrl,
      'POST',
      '/analytics/event',
      {
        cardToken: activeToken,
        eventType: 'PROFILE_VIEW',
        metadata: { visitorId: `bot-session-${testSuffix}` },
      },
      {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isBot).toBe(true);
  });

  it('rejects event for non-active card with status 400', async () => {
    const res = await requestHelper(baseUrl, 'POST', '/analytics/event', {
      cardToken: pausedToken,
      eventType: 'PROFILE_VIEW',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCode.CARD_NOT_ACTIVE);
  });

  it('returns aggregated metrics via GET /analytics/summary for authenticated customer', async () => {
    const res = await requestHelper(baseUrl, 'GET', '/analytics/summary', undefined, {
      Authorization: `Bearer ${customerToken}`,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('viewsTotal');
    expect(res.body.data).toHaveProperty('viewsToday');
    expect(res.body.data).toHaveProperty('viewsThisWeek');
    expect(res.body.data).toHaveProperty('viewsThisMonth');
    expect(res.body.data).toHaveProperty('clickBreakdown');
    expect(res.body.data.clickBreakdown).toHaveProperty('phone');
    expect(res.body.data).toHaveProperty('dailyViews');
  });

  it('returns platform telemetry via GET /admin/analytics for admin', async () => {
    const res = await requestHelper(baseUrl, 'GET', '/admin/analytics', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalEvents');
    expect(res.body.data).toHaveProperty('humanViews');
    expect(res.body.data).toHaveProperty('botViews');
    expect(res.body.data).toHaveProperty('eventBreakdown');
    expect(res.body.data).toHaveProperty('dailyViews');
  });

  it('blocks unauthenticated access to GET /analytics/summary with 401', async () => {
    const res = await requestHelper(baseUrl, 'GET', '/analytics/summary');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
