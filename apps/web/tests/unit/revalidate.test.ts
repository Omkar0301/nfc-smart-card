import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../app/api/revalidate/route';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('POST /api/revalidate', () => {
  const originalEnv = process.env.REVALIDATE_SECRET;

  beforeEach(() => {
    process.env.REVALIDATE_SECRET = 'test-secret-123';
  });

  afterEach(() => {
    process.env.REVALIDATE_SECRET = originalEnv;
    vi.clearAllMocks();
  });

  it('rejects requests with 401 when secret header is missing', async () => {
    const req = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'profile-abc' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with 401 when secret header is invalid', async () => {
    const req = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': 'wrong-secret',
      },
      body: JSON.stringify({ tag: 'profile-abc' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('rejects requests with 401 if server secret is undefined', async () => {
    delete process.env.REVALIDATE_SECRET;

    const req = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': 'any-value',
      },
      body: JSON.stringify({ tag: 'profile-abc' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects requests with 400 when tag is missing', async () => {
    const req = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': 'test-secret-123',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully invalidates cache tag when secret and tag are valid', async () => {
    const { revalidateTag } = await import('next/cache');

    const req = new Request('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': 'test-secret-123',
      },
      body: JSON.stringify({ tag: 'profile-token-xyz' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.revalidated).toBe(true);
    expect(body.data.tag).toBe('profile-token-xyz');
    expect(revalidateTag).toHaveBeenCalledWith('profile-token-xyz');
  });
});
