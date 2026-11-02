import { describe, it, expect } from 'vitest';
import {
  validateAndNormalizePhone,
  validateOtpCode,
  validateEmail,
} from '../../src/shared/utils/validation';

describe('Validation Utilities', () => {
  describe('validateAndNormalizePhone', () => {
    it('accepts valid E.164 phone numbers with +', () => {
      const res = validateAndNormalizePhone('+919876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
      expect(res.error).toBeUndefined();
    });

    it('accepts US phone numbers with +1', () => {
      const res = validateAndNormalizePhone('+15551234567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+15551234567');
    });

    it('accepts 10-digit Indian numbers and prepends +91', () => {
      const res = validateAndNormalizePhone('9876543210');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('handles human formatting with spaces and dashes', () => {
      const res1 = validateAndNormalizePhone('+91 98765-43210');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('+919876543210');

      const res2 = validateAndNormalizePhone('98765 43210');
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe('+919876543210');
    });

    it('rejects empty input', () => {
      const res = validateAndNormalizePhone('   ');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Phone number is required.');
    });

    it('rejects numbers that are too short', () => {
      const res = validateAndNormalizePhone('12345');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('at least 10 digits');
    });

    it('rejects invalid characters', () => {
      const res = validateAndNormalizePhone('98765abcde');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('digits');
    });
  });

  describe('validateOtpCode', () => {
    it('accepts exact 6 digit code', () => {
      const res = validateOtpCode('123456');
      expect(res.isValid).toBe(true);
      expect(res.cleanCode).toBe('123456');
    });

    it('strips non-digits and detects incomplete codes', () => {
      const res = validateOtpCode('12a3');
      expect(res.isValid).toBe(false);
      expect(res.cleanCode).toBe('123');
      expect(res.error).toContain('3/6');
    });

    it('rejects empty code', () => {
      const res = validateOtpCode('');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Verification code is required.');
    });
  });

  describe('validateEmail', () => {
    it('accepts valid email', () => {
      const res = validateEmail('user@example.com');
      expect(res.isValid).toBe(true);
      expect(res.trimmedEmail).toBe('user@example.com');
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('not-an-email').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
    });

    it('rejects empty email', () => {
      const res = validateEmail('  ');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Email address is required.');
    });
  });
});
