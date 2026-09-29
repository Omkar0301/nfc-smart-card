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

describe('Card Claiming & Activation Integration Tests (F-007)', () => {
  let server: Server;
  let baseUrl: string;

  let customer1Id: string;
  let customer1Token: string;
  let customer2Id: string;
  let customer2Token: string;

  let testCardTypeId: string;
  let testCardTypeSlug: string;

  let availableToken: string;
  let availableCardId: string;
  let assignedToken: string;
  let activeToken: string;
  let pausedToken: string;
  let suspendedToken: string;
  let deactivatedToken: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;

    // Create test customer 1
    const user1 = await prisma.user.create({
      data: {
        name: `Claim Customer 1 ${randomSuffix}`,
        phone: `+191${randomSuffix}`,
        email: `claim_user1_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customer1Id = user1.id;
    customer1Token = signAccessToken(user1.id, Role.CUSTOMER);

    // Create test customer 2
    const user2 = await prisma.user.create({
      data: {
        name: `Claim Customer 2 ${randomSuffix}`,
        phone: `+192${randomSuffix}`,
        email: `claim_user2_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customer2Id = user2.id;
    customer2Token = signAccessToken(user2.id, Role.CUSTOMER);

    // Create test CardType
    testCardTypeSlug = `claim-type-${randomSuffix}`;
    const cardType = await prisma.cardType.create({
      data: {
        name: `Claim Card Type ${randomSuffix}`,
        slug: testCardTypeSlug,
        cardNumberPrefix: `CL${randomSuffix.toString().slice(-4)}`,
        status: 'ACTIVE',
        fieldSchema: [],
      },
    });
    testCardTypeId = cardType.id;

    // Create test cards for status matrix
    availableToken = `tok-avail-${randomSuffix}`;
    const cardAvail = await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-01`,
        publicToken: availableToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.AVAILABLE,
      },
    });
    availableCardId = cardAvail.id;

    assignedToken = `tok-assigned-${randomSuffix}`;
    await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-02`,
        publicToken: assignedToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.ASSIGNED,
      },
    });

    activeToken = `tok-active-${randomSuffix}`;
    await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-03`,
        publicToken: activeToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.ACTIVE,
      },
    });

    pausedToken = `tok-paused-${randomSuffix}`;
    await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-04`,
        publicToken: pausedToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.PAUSED,
      },
    });

    suspendedToken = `tok-suspended-${randomSuffix}`;
    await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-05`,
        publicToken: suspendedToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.SUSPENDED,
      },
    });

    deactivatedToken = `tok-deactivated-${randomSuffix}`;
    await prisma.nFCCard.create({
      data: {
        cardNumber: `CL-${randomSuffix}-06`,
        publicToken: deactivatedToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.DEACTIVATED,
      },
    });
  });

  afterAll(async () => {
    await prisma.profile.deleteMany({
      where: { userId: { in: [customer1Id, customer2Id] } },
    });
    await prisma.cardAssignment.deleteMany({
      where: { userId: { in: [customer1Id, customer2Id] } },
    });
    await prisma.nFCCard.deleteMany({
      where: { cardTypeId: testCardTypeId },
    });
    await prisma.cardType.deleteMany({
      where: { id: testCardTypeId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customer1Id, customer2Id] } },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('GET /cards/:token — Public Card Lookup', () => {
    it('returns 404 for non-existent token', async () => {
      const res = await get(baseUrl, '/cards/non-existent-token-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CARD_NOT_FOUND');
    });

    it('returns 200 with AVAILABLE status and cardType info without auth', async () => {
      const res = await get(baseUrl, `/cards/${availableToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(CardStatus.AVAILABLE);
      expect(res.body.data.cardType.slug).toBe(testCardTypeSlug);
      expect(res.body.data.cardType.name).toContain('Claim Card Type');
    });

    it('returns 200 with ACTIVE status, cardType, and publicToken', async () => {
      const res = await get(baseUrl, `/cards/${activeToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(CardStatus.ACTIVE);
      expect(res.body.data.publicToken).toBe(activeToken);
      expect(res.body.data.cardType.slug).toBe(testCardTypeSlug);
    });

    it('returns 200 with status for ASSIGNED, PAUSED, SUSPENDED, DEACTIVATED', async () => {
      const resAssigned = await get(baseUrl, `/cards/${assignedToken}`);
      expect(resAssigned.status).toBe(200);
      expect(resAssigned.body.data.status).toBe(CardStatus.ASSIGNED);

      const resPaused = await get(baseUrl, `/cards/${pausedToken}`);
      expect(resPaused.status).toBe(200);
      expect(resPaused.body.data.status).toBe(CardStatus.PAUSED);

      const resSuspended = await get(baseUrl, `/cards/${suspendedToken}`);
      expect(resSuspended.status).toBe(200);
      expect(resSuspended.body.data.status).toBe(CardStatus.SUSPENDED);

      const resDeactivated = await get(baseUrl, `/cards/${deactivatedToken}`);
      expect(resDeactivated.status).toBe(200);
      expect(resDeactivated.body.data.status).toBe(CardStatus.DEACTIVATED);
    });
  });

  describe('POST /cards/:token/claim — Card Claiming & Activation', () => {
    it('returns 401 UNAUTHORIZED when no auth token provided', async () => {
      const res = await post(baseUrl, `/cards/${availableToken}/claim`, {});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('successfully claims an AVAILABLE card, creates assignment, and initializes draft profile', async () => {
      const res = await post(baseUrl, `/cards/${availableToken}/claim`, {}, customer1Token);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card.id).toBe(availableCardId);
      expect(res.body.data.card.status).toBe(CardStatus.ASSIGNED);
      expect(res.body.data.assignment.id).toBeDefined();
      expect(res.body.data.profile.id).toBeDefined();
      expect(res.body.data.profile.status).toBe('draft');

      // Verify DB state
      const dbCard = await prisma.nFCCard.findUnique({ where: { id: availableCardId } });
      expect(dbCard?.status).toBe(CardStatus.ASSIGNED);

      const dbAssignment = await prisma.cardAssignment.findFirst({
        where: { cardId: availableCardId, userId: customer1Id, status: 'ACTIVE' },
      });
      expect(dbAssignment).not.toBeNull();

      const dbProfile = await prisma.profile.findFirst({
        where: { userId: customer1Id, cardTypeId: testCardTypeId },
      });
      expect(dbProfile).not.toBeNull();
      expect(dbProfile?.status).toBe('draft');
    });

    it('returns 409 CARD_NOT_AVAILABLE when a second user attempts to claim the now ASSIGNED card', async () => {
      const res = await post(baseUrl, `/cards/${availableToken}/claim`, {}, customer2Token);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CARD_NOT_AVAILABLE');
    });

    it('returns 409 USER_ALREADY_HAS_CARD when user already owns an active card of same type', async () => {
      // Create a second available card of the same cardType
      const secondCard = await prisma.nFCCard.create({
        data: {
          cardNumber: `CL-${randomSuffix}-99`,
          publicToken: `tok-second-${randomSuffix}`,
          cardTypeId: testCardTypeId,
          status: CardStatus.AVAILABLE,
        },
      });

      // Customer 1 already owns an active card of this cardType
      const res = await post(baseUrl, `/cards/${secondCard.publicToken}/claim`, {}, customer1Token);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_ALREADY_HAS_CARD');
    });
  });
});
