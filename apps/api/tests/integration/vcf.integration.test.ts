import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { CardStatus, Role, UserStatus } from '@nfc-card/shared';

function requestHelper(baseUrl: string, method: string, endpoint: string) {
  return new Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    rawText: string;
    body: any;
  }>((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {},
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
            rawText: data,
            body: jsonBody,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('VCF Contact Integration Tests (F-013)', () => {
  let server: Server;
  let baseUrl: string;

  const testSuffix = Math.floor(Math.random() * 100000);
  const userPhone = `+1999${testSuffix.toString().padStart(7, '0')}`;
  const publicTokenActive = `tok-active-vcf-${testSuffix}`;
  const publicTokenPaused = `tok-paused-vcf-${testSuffix}`;
  const cardNumberActive = `BC-VCF-${testSuffix}`;
  const cardNumberPaused = `BC-VCF-P-${testSuffix}`;

  let createdCardTypeId: string;
  let createdUserId: string;
  let activeCardId: string;
  let pausedCardId: string;

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

    // 1. Create or ensure CardType exists
    const cardType = await prisma.cardType.create({
      data: {
        name: `VCF Test Type ${testSuffix}`,
        slug: `vcf-test-${testSuffix}`,
        cardNumberPrefix: `VCF${testSuffix.toString().slice(0, 4)}`,
        fieldSchema: [
          { key: 'name', label: 'Full Name', type: 'text', required: true, defaultVisible: true },
          {
            key: 'designation',
            label: 'Designation',
            type: 'text',
            required: false,
            defaultVisible: true,
          },
          { key: 'company', label: 'Company', type: 'text', required: false, defaultVisible: true },
          {
            key: 'phone',
            label: 'Phone Number',
            type: 'phone',
            required: false,
            defaultVisible: true,
          },
          { key: 'email', label: 'Email', type: 'email', required: false, defaultVisible: true },
          {
            key: 'address',
            label: 'Address',
            type: 'address',
            required: false,
            defaultVisible: false,
          },
        ] as any,
      },
    });
    createdCardTypeId = cardType.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        name: 'Sarah Connor',
        phone: userPhone,
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
      },
    });
    createdUserId = user.id;

    // 3. Create ACTIVE card with Assignment and Published Profile
    const activeCard = await prisma.nFCCard.create({
      data: {
        cardNumber: cardNumberActive,
        publicToken: publicTokenActive,
        cardTypeId: createdCardTypeId,
        status: CardStatus.ACTIVE,
      },
    });
    activeCardId = activeCard.id;

    await prisma.cardAssignment.create({
      data: {
        userId: createdUserId,
        cardId: activeCardId,
        status: 'ACTIVE',
      },
    });

    await prisma.profile.create({
      data: {
        userId: createdUserId,
        cardTypeId: createdCardTypeId,
        status: 'published',
        data: {
          name: 'Sarah Connor',
          designation: 'Security Director',
          company: 'Cyberdyne Systems',
          phone: '+15559998877',
          email: 'sarah@cyberdyne.test',
          address: '456 Hidden Bunker Way',
        },
        fieldVisibility: {
          name: true,
          designation: true,
          company: true,
          phone: true,
          email: true,
          address: false, // hidden!
        },
      },
    });

    // 4. Create PAUSED card
    const pausedCard = await prisma.nFCCard.create({
      data: {
        cardNumber: cardNumberPaused,
        publicToken: publicTokenPaused,
        cardTypeId: createdCardTypeId,
        status: CardStatus.PAUSED,
      },
    });
    pausedCardId = pausedCard.id;

    await prisma.cardAssignment.create({
      data: {
        userId: createdUserId,
        cardId: pausedCardId,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await prisma.profile.deleteMany({ where: { userId: createdUserId } }).catch(() => {});
    await prisma.cardAssignment
      .deleteMany({ where: { cardId: { in: [activeCardId, pausedCardId] } } })
      .catch(() => {});
    await prisma.nFCCard
      .deleteMany({ where: { id: { in: [activeCardId, pausedCardId] } } })
      .catch(() => {});
    await prisma.user.deleteMany({ where: { id: createdUserId } }).catch(() => {});
    await prisma.cardType.deleteMany({ where: { id: createdCardTypeId } }).catch(() => {});

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /p/:type/:token/contact.vcf returns 200 with text/vcard and attachment header', async () => {
    const slug = `vcf-test-${testSuffix}`;
    const res = await requestHelper(baseUrl, 'GET', `/p/${slug}/${publicTokenActive}/contact.vcf`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/vcard');
    expect(res.headers['content-disposition']).toBe('attachment; filename="Sarah_Connor.vcf"');

    expect(res.rawText).toContain('BEGIN:VCARD');
    expect(res.rawText).toContain('VERSION:3.0');
    expect(res.rawText).toContain('FN:Sarah Connor');
    expect(res.rawText).toContain('ORG:Cyberdyne Systems');
    expect(res.rawText).toContain('TITLE:Security Director');
    expect(res.rawText).toContain('TEL;TYPE=CELL,VOICE:+15559998877');
    expect(res.rawText).toContain('EMAIL;TYPE=PREF,INTERNET:sarah@cyberdyne.test');
    // Hidden address must be absent
    expect(res.rawText).not.toContain('456 Hidden Bunker Way');
    expect(res.rawText).toContain('END:VCARD');
  });

  it('GET /profile/public/:token/contact.vcf returns 200 with vCard content', async () => {
    const res = await requestHelper(
      baseUrl,
      'GET',
      `/profile/public/${publicTokenActive}/contact.vcf`
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/vcard');
    expect(res.rawText).toContain('BEGIN:VCARD');
    expect(res.rawText).toContain('FN:Sarah Connor');
  });

  it('GET /p/:type/:token/contact.vcf returns 403 CARD_PAUSED when card is paused', async () => {
    const slug = `vcf-test-${testSuffix}`;
    const res = await requestHelper(baseUrl, 'GET', `/p/${slug}/${publicTokenPaused}/contact.vcf`);

    expect(res.status).toBe(403);
    expect(res.body?.success).toBe(false);
    expect(res.body?.error?.code).toBe('CARD_PAUSED');
  });

  it('GET /p/:type/:token/contact.vcf returns 404 when token does not exist', async () => {
    const slug = `vcf-test-${testSuffix}`;
    const res = await requestHelper(baseUrl, 'GET', `/p/${slug}/non-existent-token/contact.vcf`);

    expect(res.status).toBe(404);
    expect(res.body?.success).toBe(false);
    expect(res.body?.error?.code).toBe('CARD_NOT_FOUND');
  });
});
