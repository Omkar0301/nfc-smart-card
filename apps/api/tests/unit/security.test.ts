import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import app from '../../src/app.js';
import { ErrorCode } from '@nfc-card/shared';

describe('Security Hardening & Rate Limiting (F-017)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('Express responses include Helmet security headers', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBeDefined();
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  });

  it('rate limits /auth/send-otp after exceeding threshold when test rate limit header is provided', async () => {
    const phone = '+15551234567';

    // 1st request
    await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-rate-limit': 'true' },
      body: JSON.stringify({ phone }),
    });

    // 2nd request
    await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-rate-limit': 'true' },
      body: JSON.stringify({ phone }),
    });

    // 3rd request
    await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-rate-limit': 'true' },
      body: JSON.stringify({ phone }),
    });

    // 4th request -> must exceed 3 requests threshold
    const res4 = await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-rate-limit': 'true' },
      body: JSON.stringify({ phone }),
    });

    const body4 = await res4.json();
    expect(res4.status).toBe(429);
    expect(body4.success).toBe(false);
    expect(body4.error.code).toBe(ErrorCode.RATE_LIMITED);
  });
});
