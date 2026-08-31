import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { hashRecoveryToken } from '../../src/services/recovery.service.js';
import { hashOtp } from '../../src/services/otp.service.js';
import { Role } from '@nfc-card/shared';

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

function post(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'POST', endpoint, body, token);
}

function put(baseUrl: string, endpoint: string, body: Record<string, any>, token?: string) {
  return requestHelper(baseUrl, 'PUT', endpoint, body, token);
}

describe('Account Recovery Integration Tests (F-003)', () => {
  let server: Server;
  let baseUrl: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const user1Phone = `+1700${randomSuffix}`;
  const user1Email = `user1_${randomSuffix}@example.com`;
  const user2Phone = `+1701${randomSuffix}`;
  const user2Email = `user2_${randomSuffix}@example.com`;
  const newPhone = `+1702${randomSuffix}`;

  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const u1 = await prisma.user.create({
      data: {
        name: 'Recovery Test User 1',
        phone: user1Phone,
        email: user1Email,
        role: Role.CUSTOMER,
      },
    });
    user1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        name: 'Recovery Test User 2',
        phone: user2Phone,
        email: user2Email,
        role: Role.CUSTOMER,
      },
    });
    user2Id = u2.id;

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await prisma.accountRecoveryToken.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } },
    });
    await prisma.otpVerification.deleteMany({
      where: { phone: { in: [user1Phone, user2Phone, newPhone] } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('POST /auth/recover/request returns generic 200 for registered email and generates token', async () => {
    const res = await post(baseUrl, '/auth/recover/request', { email: user1Email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('recovery link has been sent');

    // Verify token was stored in DB hashed
    const tokens = await prisma.accountRecoveryToken.findMany({
      where: { userId: user1Id },
    });
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].tokenHash).toHaveLength(64);
  });

  it('POST /auth/recover/request returns identical 200 for unregistered email (no info leak)', async () => {
    const res = await post(baseUrl, '/auth/recover/request', { email: 'nonexistent@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('recovery link has been sent');
  });

  it('POST /auth/recover/request validates email format', async () => {
    const res = await post(baseUrl, '/auth/recover/request', { email: 'invalid-email-string' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/recover/request rate limits after 3 requests in 1 hour', async () => {
    // We already sent 1 request for user1. Let's send 2 more.
    await post(baseUrl, '/auth/recover/request', { email: user1Email });
    await post(baseUrl, '/auth/recover/request', { email: user1Email });

    // 4th request should hit 429
    const rateLimitedRes = await post(baseUrl, '/auth/recover/request', { email: user1Email });
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.success).toBe(false);
    expect(rateLimitedRes.body.error?.code).toBe('RATE_LIMITED');
  });

  it('POST /auth/recover/verify with valid token authenticates user and sets session', async () => {
    const rawToken = 'testvalidtoken1234567890abcdef1234567890abcdef1234567890abcdef12';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user2Id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.accessToken).toBeDefined();
    expect(res.body.data?.user?.id).toBe(user2Id);
    expect(res.body.data?.user?.phone).toBe(user2Phone);

    // Verify token is now marked as used
    const tokenInDb = await prisma.accountRecoveryToken.findFirst({
      where: { tokenHash },
    });
    expect(tokenInDb?.usedAt).not.toBeNull();
  });

  it('POST /auth/recover/verify rejects already used token with RECOVERY_TOKEN_USED', async () => {
    const rawToken = 'testusedtoken1234567890abcdef1234567890abcdef1234567890abcdef12';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user2Id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const res = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('RECOVERY_TOKEN_USED');
  });

  it('POST /auth/recover/verify rejects expired token with RECOVERY_TOKEN_EXPIRED', async () => {
    const rawToken = 'testexpiredtoken1234567890abcdef1234567890abcdef1234567890abcdef';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user2Id,
        tokenHash,
        expiresAt: new Date(Date.now() - 10000),
      },
    });

    const res = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('RECOVERY_TOKEN_EXPIRED');
  });

  it('POST /auth/recover/verify rejects unknown token with RECOVERY_TOKEN_INVALID', async () => {
    const res = await post(baseUrl, '/auth/recover/verify', { token: 'nonexistent-token' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('RECOVERY_TOKEN_INVALID');
  });

  it('PUT /auth/recover/phone updates phone after recovery when valid OTP is provided', async () => {
    // Generate valid session token for user2
    const rawToken = 'testsessiontoken1234567890abcdef1234567890abcdef1234567890abcdef';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user2Id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const verifyRes = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    const accessToken = verifyRes.body.data.accessToken;

    // Create OTP record for new phone
    const otpCode = '987654';
    const codeHash = hashOtp(newPhone, otpCode);
    await prisma.otpVerification.create({
      data: {
        phone: newPhone,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const updatePhoneRes = await put(
      baseUrl,
      '/auth/recover/phone',
      { phone: newPhone, otpCode },
      accessToken
    );

    expect(updatePhoneRes.status).toBe(200);
    expect(updatePhoneRes.body.success).toBe(true);

    const userInDb = await prisma.user.findUnique({ where: { id: user2Id } });
    expect(userInDb?.phone).toBe(newPhone);
  });

  it('PUT /auth/recover/phone prevents assigning a phone number already used by another user', async () => {
    // Generate valid session token for user1
    const rawToken = 'testsessiontokenuser11234567890abcdef1234567890abcdef1234567890a';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user1Id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const verifyRes = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    const accessToken = verifyRes.body.data.accessToken;

    // Create OTP record for newPhone (which now belongs to user2)
    const otpCode = '123456';
    const codeHash = hashOtp(newPhone, otpCode);
    await prisma.otpVerification.create({
      data: {
        phone: newPhone,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const conflictRes = await put(
      baseUrl,
      '/auth/recover/phone',
      { phone: newPhone, otpCode },
      accessToken
    );

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error?.code).toBe('PHONE_IN_USE');
  });

  it('PUT /auth/email updates user recovery email and prevents duplicates', async () => {
    const rawToken = 'testsessiontokenemailupdate1234567890abcdef1234567890abcdef12345';
    const tokenHash = hashRecoveryToken(rawToken);

    await prisma.accountRecoveryToken.create({
      data: {
        userId: user1Id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const verifyRes = await post(baseUrl, '/auth/recover/verify', { token: rawToken });
    const accessToken = verifyRes.body.data.accessToken;

    const updatedEmail = `newemail_${randomSuffix}@example.com`;
    const res = await put(baseUrl, '/auth/email', { email: updatedEmail }, accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await prisma.user.findUnique({ where: { id: user1Id } });
    expect(userInDb?.email).toBe(updatedEmail);

    // Attempting to set user1's email to user2's email should return 409 EMAIL_IN_USE
    const conflictRes = await put(baseUrl, '/auth/email', { email: user2Email }, accessToken);
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error?.code).toBe('EMAIL_IN_USE');
  });
});
