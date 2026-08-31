import { describe, it, expect } from 'vitest';
import { generateRecoveryToken, hashRecoveryToken } from '../../src/services/recovery.service.js';

describe('Account Recovery Utilities (recovery.service.ts)', () => {
  it('should generate secure cryptographically random hex recovery tokens', () => {
    const token1 = generateRecoveryToken();
    const token2 = generateRecoveryToken();

    expect(typeof token1).toBe('string');
    expect(token1).toHaveLength(64); // 32 bytes hex = 64 characters
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('should deterministically SHA-256 hash recovery tokens', () => {
    const rawToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const hash1 = hashRecoveryToken(rawToken);
    const hash2 = hashRecoveryToken(rawToken);

    expect(typeof hash1).toBe('string');
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });

  it('should produce distinct hashes for different tokens', () => {
    const hashA = hashRecoveryToken('token-a');
    const hashB = hashRecoveryToken('token-b');

    expect(hashA).not.toBe(hashB);
  });
});
