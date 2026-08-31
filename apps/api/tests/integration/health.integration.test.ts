import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { Server } from 'node:http';
import app from '../../src/app.js';

describe('API Health Feature Integration Tests', () => {
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

  it('GET /health should return 200 with standard healthy envelope', async () => {
    const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
      http
        .get(`${baseUrl}/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          });
        })
        .on('error', reject);
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.status).toBe('healthy');
    expect(res.body.message).toBe('NFC Card API is running');
  });

  it('GET /admin/health without token should return 401 UNAUTHORIZED', async () => {
    const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
      http
        .get(`${baseUrl}/admin/health`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          });
        })
        .on('error', reject);
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('UNAUTHORIZED');
  });
});
