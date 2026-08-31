import { describe, it, expect } from 'vitest';
import { Role } from '@nfc-card/shared';
import { signAccessToken, verifyAccessToken } from '../../src/services/token.service.js';

describe('JWT Token Utilities (jwt.ts)', () => {
  const userId = 'cuid1234567890';
  const role = Role.CUSTOMER;

  it('should sign and verify valid access tokens', () => {
    const token = signAccessToken(userId, role);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const verified = verifyAccessToken(token);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.userId).toBe(userId);
      expect(verified.role).toBe(Role.CUSTOMER);
    }
    if (!verified.ok) throw new Error('Token verification failed');
    expect(verified.userId).toBe(userId);
    expect(verified.role).toBe(Role.CUSTOMER);
  });

  it('should reject tampered or invalid access tokens', () => {
    const invalid = verifyAccessToken('invalid.token.payload');
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.code).toBe('UNAUTHORIZED');
    }
    if (invalid.ok) throw new Error('Expected token verification to fail');
    expect(invalid.code).toBe('UNAUTHORIZED');
  });
});
