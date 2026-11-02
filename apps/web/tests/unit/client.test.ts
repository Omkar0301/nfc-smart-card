import { describe, it, expect, beforeEach } from 'vitest';
import {
  ApiError,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
} from '../../src/shared/api/client';
import { ErrorCode } from '@nfc-card/shared';

describe('API Client', () => {
  beforeEach(() => {
    setAccessToken(null);
    setRefreshToken(null);
  });

  describe('ApiError', () => {
    it('initializes status, code, and message correctly', () => {
      const err = new ApiError(404, ErrorCode.CARD_NOT_FOUND, 'Card does not exist', {
        details: '123',
      });
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.code).toBe(ErrorCode.CARD_NOT_FOUND);
      expect(err.message).toBe('Card does not exist');
      expect(err.extra).toEqual({ details: '123' });
    });
  });

  describe('Token management', () => {
    it('sets and retrieves access token correctly', () => {
      expect(getAccessToken()).toBeNull();
      setAccessToken('sample-token-abc');
      expect(getAccessToken()).toBe('sample-token-abc');
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });
  });
});
