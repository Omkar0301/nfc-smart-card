import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  profileTokenParamSchema,
} from '../../src/validators/profile.validator.js';

describe('Profile Validator Unit Tests (F-008)', () => {
  describe('updateProfileSchema', () => {
    it('accepts an empty object for incremental updates', () => {
      const parsed = updateProfileSchema.safeParse({});
      expect(parsed.success).toBe(true);
    });

    it('validates a complete update payload', () => {
      const data = updateProfileSchema.parse({
        data: {
          name: 'Jane Doe',
          bio: 'Software Engineer',
          skills: ['TypeScript', 'Node.js'],
        },
        fieldVisibility: {
          name: true,
          bio: true,
          phone: false,
        },
        publish: true,
        templateId: 'tpl-modern-123',
      });
      expect(data.publish).toBe(true);
      expect(data.templateId).toBe('tpl-modern-123');
      expect(data.data?.name).toBe('Jane Doe');
      expect(data.fieldVisibility?.phone).toBe(false);
    });

    it('accepts templateId as null to clear template selection', () => {
      const data = updateProfileSchema.parse({
        templateId: null,
      });
      expect(data.templateId).toBeNull();
    });

    it('accepts unpublish payload (publish: false)', () => {
      const data = updateProfileSchema.parse({
        publish: false,
      });
      expect(data.publish).toBe(false);
    });

    it('rejects invalid fieldVisibility values when not boolean', () => {
      const parsed = updateProfileSchema.safeParse({
        fieldVisibility: {
          name: 'true' as any,
        },
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid publish when not boolean', () => {
      const parsed = updateProfileSchema.safeParse({
        publish: 'yes' as any,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('profileTokenParamSchema', () => {
    it('accepts a valid non-empty token param', () => {
      const data = profileTokenParamSchema.parse({
        token: 'public-tok-abc-123',
      });
      expect(data.token).toBe('public-tok-abc-123');
    });

    it('rejects an empty token string', () => {
      const parsed = profileTokenParamSchema.safeParse({
        token: '',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects missing token param', () => {
      const parsed = profileTokenParamSchema.safeParse({});
      expect(parsed.success).toBe(false);
    });
  });
});
