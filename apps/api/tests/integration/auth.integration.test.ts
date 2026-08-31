import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

function post(baseUrl: string, endpoint: string, body: Record<string, string>, token?: string) {
  return new Promise<{ status: number; body: Record<string, any> }>((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const req = http.request(
      url,
      {
        method: 'POST',
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
    req.write(JSON.stringify(body));
    req.end();
  });
}

function get(baseUrl: string, endpoint: string, token?: string) {
  return new Promise<{ status: number; body: Record<string, any> }>((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const req = http.request(
      url,
      {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    req.end();
  });
}

describe('Authentication Feature Integration Tests (F-002)', () => {
  let server: Server;
  let baseUrl: string;

  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const testPhone = `+1555${randomSuffix}`;
  const ratePhone = `+1888${randomSuffix}`;

  beforeAll(async () => {
    await prisma.otpVerification.deleteMany({
      where: {
        phone: { in: [testPhone, ratePhone] },
      },
    });

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await prisma.otpVerification.deleteMany({
      where: {
        phone: { in: [testPhone, ratePhone] },
      },
    });

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('POST /auth/send-otp should return 200 with standard envelope', async () => {
    const res = await post(baseUrl, '/auth/send-otp', { phone: testPhone });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.sent).toBe(true);
  });

  it('GET /auth/me without token should return 401 UNAUTHORIZED', async () => {
    const res = await get(baseUrl, '/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });

  it('POST /auth/verify-otp with wrong code should return 400 OTP_INVALID', async () => {
    const res = await post(baseUrl, '/auth/verify-otp', { phone: testPhone, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('OTP_INVALID');
  });

  it('should rate limit OTP requests after 3 sends per 10 minutes', async () => {
    for (let i = 0; i < 3; i++) {
      await post(baseUrl, '/auth/send-otp', { phone: ratePhone });
    }
    const rateLimitedRes = await post(baseUrl, '/auth/send-otp', { phone: ratePhone });
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body.success).toBe(false);
    expect(rateLimitedRes.body.error?.code).toBe('RATE_LIMITED');
  });

  it('POST /auth/send-otp with invalid phone format should return 400 INVALID_PHONE', async () => {
    const res = await post(baseUrl, '/auth/send-otp', { phone: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INVALID_PHONE');
  });
});
