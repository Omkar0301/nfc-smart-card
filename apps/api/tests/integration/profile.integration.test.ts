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

function put(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'PUT', endpoint, body, token);
}

describe('Profile Management Integration Tests (F-008)', () => {
  let server: Server;
  let baseUrl: string;

  let customer1Id: string;
  let customer1Token: string;
  let customer2Id: string;
  let customer2Token: string;

  let testCardTypeId: string;
  let testCardTypeSlug: string;

  let card1Id: string;
  let card1Token: string;
  let cardAvailableId: string;
  let cardAvailableToken: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;

    // 1. Create test customer 1 (has card)
    const user1 = await prisma.user.create({
      data: {
        name: `Profile Customer 1 ${randomSuffix}`,
        phone: `+193${randomSuffix}`,
        email: `profile_cust1_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customer1Id = user1.id;
    customer1Token = signAccessToken(user1.id, Role.CUSTOMER);

    // 2. Create test customer 2 (no card)
    const user2 = await prisma.user.create({
      data: {
        name: `Profile Customer 2 ${randomSuffix}`,
        phone: `+194${randomSuffix}`,
        email: `profile_cust2_${randomSuffix}@example.com`,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    customer2Id = user2.id;
    customer2Token = signAccessToken(user2.id, Role.CUSTOMER);

    // 3. Create test CardType with config-driven fieldSchema
    testCardTypeSlug = `prof-type-${randomSuffix}`;
    const cardType = await prisma.cardType.create({
      data: {
        name: `Profile Card Type ${randomSuffix}`,
        slug: testCardTypeSlug,
        cardNumberPrefix: `PF${randomSuffix.toString().slice(-4)}`,
        status: 'ACTIVE',
        fieldSchema: [
          {
            key: 'name',
            label: 'Full Name',
            type: 'text',
            required: true,
            defaultVisible: true,
          },
          {
            key: 'designation',
            label: 'Designation',
            type: 'text',
            required: false,
            defaultVisible: true,
          },
          {
            key: 'phone',
            label: 'Phone Number',
            type: 'phone',
            required: false,
            defaultVisible: true,
          },
          {
            key: 'address',
            label: 'Home Address',
            type: 'address',
            required: false,
            defaultVisible: false,
          },
          {
            key: 'student_id',
            label: 'Student ID',
            type: 'text',
            required: false,
            defaultVisible: false,
          },
        ],
      },
    });
    testCardTypeId = cardType.id;

    // 4. Create Card 1 and assign to customer 1
    card1Token = `tok-prof-${randomSuffix}`;
    const card1 = await prisma.nFCCard.create({
      data: {
        cardNumber: `PF-${randomSuffix}-01`,
        publicToken: card1Token,
        cardTypeId: testCardTypeId,
        status: CardStatus.ASSIGNED,
      },
    });
    card1Id = card1.id;

    await prisma.cardAssignment.create({
      data: {
        cardId: card1Id,
        userId: customer1Id,
        status: 'ACTIVE',
      },
    });

    // 5. Create an AVAILABLE card (not claimed/assigned)
    cardAvailableToken = `tok-prof-avail-${randomSuffix}`;
    const cardAvail = await prisma.nFCCard.create({
      data: {
        cardNumber: `PF-${randomSuffix}-02`,
        publicToken: cardAvailableToken,
        cardTypeId: testCardTypeId,
        status: CardStatus.AVAILABLE,
      },
    });
    cardAvailableId = cardAvail.id;
  });

  afterAll(async () => {
    await prisma.profile.deleteMany({
      where: { userId: { in: [customer1Id, customer2Id] } },
    });
    await prisma.cardAssignment.deleteMany({
      where: { userId: { in: [customer1Id, customer2Id] } },
    });
    await prisma.nFCCard.deleteMany({
      where: { id: { in: [card1Id, cardAvailableId] } },
    });
    await prisma.cardType.deleteMany({
      where: { id: testCardTypeId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [customer1Id, customer2Id] } },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('Authentication & Authorization', () => {
    it('returns 401 UNAUTHORIZED when GET /profile is called without token', async () => {
      const res = await get(baseUrl, '/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('returns 401 UNAUTHORIZED when POST /profile is called without token', async () => {
      const res = await post(baseUrl, '/profile', { data: {} });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('returns 401 UNAUTHORIZED when PUT /profile is called without token', async () => {
      const res = await put(baseUrl, '/profile', { data: {} });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('returns 404 NO_ACTIVE_CARD when user has no active card assignment', async () => {
      const res = await get(baseUrl, '/profile', customer2Token);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.NO_ACTIVE_CARD);
    });
  });

  describe('GET /profile — Initial Load & Visibility Initialization', () => {
    it('initializes draft profile with default field visibility from fieldSchema', async () => {
      const res = await get(baseUrl, '/profile', customer1Token);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const profile = res.body.data.profile;
      expect(profile).toBeDefined();
      expect(profile.status).toBe('draft');
      expect(profile.cardType.slug).toBe(testCardTypeSlug);
      expect(profile.card.cardNumber).toBe(`PF-${randomSuffix}-01`);
      expect(profile.card.status).toBe(CardStatus.ASSIGNED);

      // Verify visibility defaults from fieldSchema
      expect(profile.fieldVisibility.name).toBe(true);
      expect(profile.fieldVisibility.designation).toBe(true);
      expect(profile.fieldVisibility.phone).toBe(true);
      expect(profile.fieldVisibility.address).toBe(false);
      expect(profile.fieldVisibility.student_id).toBe(false);

      // Verify persisted in DB
      const dbProfile = await prisma.profile.findFirst({
        where: { userId: customer1Id, cardTypeId: testCardTypeId },
      });
      expect(dbProfile).not.toBeNull();
      const dbVis = dbProfile?.fieldVisibility as Record<string, boolean>;
      expect(dbVis.name).toBe(true);
      expect(dbVis.address).toBe(false);
      expect(dbVis.student_id).toBe(false);
    });
  });

  describe('POST /profile & PUT /profile — Incremental Saves & Data Sanitization', () => {
    it('strips unknown keys and saves partial draft data', async () => {
      const res = await post(
        baseUrl,
        '/profile',
        {
          data: {
            designation: 'VP of Engineering',
            unknown_injection_key: 'malicious payload',
          },
          fieldVisibility: {
            phone: false, // customer explicitly toggles phone hidden
            unknown_vis_key: true,
          },
        },
        customer1Token
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const profile = res.body.data.profile;

      expect(profile.data.designation).toBe('VP of Engineering');
      expect(profile.data.unknown_injection_key).toBeUndefined();
      expect(profile.fieldVisibility.phone).toBe(false);
      expect(profile.fieldVisibility.unknown_vis_key).toBeUndefined();
      expect(profile.status).toBe('draft');
    });
  });

  describe('PUT /profile — Publish Validation & Lifecycle Transition', () => {
    it('rejects publish when required field (name) is missing', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          publish: true,
        },
        customer1Token
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING);
      expect(res.body.error.details.field).toBe('name');

      // Card must remain ASSIGNED
      const card = await prisma.nFCCard.findUnique({ where: { id: card1Id } });
      expect(card?.status).toBe(CardStatus.ASSIGNED);
    });

    it('rejects publish when required field (name) is blank whitespace', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          data: { name: '   ' },
          publish: true,
        },
        customer1Token
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING);
    });

    it('publishes profile successfully and transitions card status ASSIGNED -> ACTIVE', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          data: {
            name: 'Sarah Connor',
            phone: '+15559876543',
            address: '42 Secret Underground Bunker',
            student_id: 'ID-888999',
          },
          publish: true,
        },
        customer1Token
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.status).toBe('published');
      expect(res.body.data.profile.card.status).toBe(CardStatus.ACTIVE);

      // Verify DB state
      const dbProfile = await prisma.profile.findFirst({
        where: { userId: customer1Id, cardTypeId: testCardTypeId },
      });
      expect(dbProfile?.status).toBe('published');

      const dbCard = await prisma.nFCCard.findUnique({ where: { id: card1Id } });
      expect(dbCard?.status).toBe(CardStatus.ACTIVE);
    });
  });

  describe('GET /profile/public/:token — Server-Side Visibility Enforcement', () => {
    it('returns only public fields and never exposes hidden fields', async () => {
      const res = await get(baseUrl, `/profile/public/${card1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const profile = res.body.data.profile;
      expect(profile).toBeDefined();
      expect(profile.status).toBe('published');

      const publicData = profile.data;
      // Visible fields
      expect(publicData.name).toBe('Sarah Connor');
      expect(publicData.designation).toBe('VP of Engineering');

      // CRITICAL SECURITY REQUIREMENT: Hidden fields must NEVER appear
      // Phone was explicitly set to false by user
      expect(publicData.phone).toBeUndefined();
      // Address defaults to false in schema
      expect(publicData.address).toBeUndefined();
      // Student ID defaults to false in schema
      expect(publicData.student_id).toBeUndefined();
    });

    it('immediately reflects visibility toggle changes on public endpoint without re-publishing', async () => {
      // User toggles address visible and phone visible
      const updateRes = await put(
        baseUrl,
        '/profile',
        {
          fieldVisibility: {
            address: true,
          },
        },
        customer1Token
      );
      expect(updateRes.status).toBe(200);

      // Public page immediately returns address
      const res = await get(baseUrl, `/profile/public/${card1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.profile.data.address).toBe('42 Secret Underground Bunker');
      // student_id still hidden
      expect(res.body.data.profile.data.student_id).toBeUndefined();
    });

    it('rejects clearing required fields on an already published profile', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          data: { name: '' },
        },
        customer1Token
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING);
    });
  });

  describe('PUT /profile — Unpublish (publish: false)', () => {
    it('unpublishes profile to draft and transitions card status ACTIVE -> ASSIGNED', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          publish: false,
        },
        customer1Token
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.status).toBe('draft');
      expect(res.body.data.profile.card.status).toBe(CardStatus.ASSIGNED);

      // DB check
      const dbCard = await prisma.nFCCard.findUnique({ where: { id: card1Id } });
      expect(dbCard?.status).toBe(CardStatus.ASSIGNED);

      // Public endpoint returns draft placeholder
      const publicRes = await get(baseUrl, `/profile/public/${card1Token}`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.profileStatus).toBe('draft');
      expect(publicRes.body.data.profile).toBeUndefined();
    });
  });

  describe('Card Lifecycle Constraints & Edge Cases', () => {
    it('returns 409 CARD_PAUSED when attempting to publish a PAUSED card', async () => {
      // Set card to PAUSED
      await prisma.nFCCard.update({
        where: { id: card1Id },
        data: { status: CardStatus.PAUSED },
      });

      const res = await put(
        baseUrl,
        '/profile',
        {
          publish: true,
        },
        customer1Token
      );

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCode.CARD_PAUSED);
    });

    it('returns 409 CARD_SUSPENDED when attempting to publish a SUSPENDED card', async () => {
      // Set card to SUSPENDED
      await prisma.nFCCard.update({
        where: { id: card1Id },
        data: { status: CardStatus.SUSPENDED },
      });

      const res = await put(
        baseUrl,
        '/profile',
        {
          publish: true,
        },
        customer1Token
      );

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCode.CARD_SUSPENDED);
    });

    it('returns 409 CARD_SUSPENDED when attempting to unpublish a SUSPENDED card', async () => {
      const res = await put(
        baseUrl,
        '/profile',
        {
          publish: false,
        },
        customer1Token
      );

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCode.CARD_SUSPENDED);
    });

    it('returns 404 CARD_NOT_FOUND on public endpoint for non-existent token', async () => {
      const res = await get(baseUrl, '/profile/public/token-does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.CARD_NOT_FOUND);
    });

    it('returns 404 CARD_NOT_AVAILABLE on public endpoint for AVAILABLE card', async () => {
      const res = await get(baseUrl, `/profile/public/${cardAvailableToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.CARD_NOT_AVAILABLE);
    });
  });
});
