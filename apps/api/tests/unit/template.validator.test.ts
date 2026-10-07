import { describe, it, expect } from 'vitest';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateListQuerySchema,
} from '../../src/validators/template.validator.js';

describe('Template Validator Unit Tests (F-009)', () => {
  it('validates a valid createTemplate payload', () => {
    const parsed = createTemplateSchema.safeParse({
      cardTypeId: 'ct-business',
      name: 'Modern',
      slug: 'business-modern',
      thumbnail: 'https://example.com/preview.png',
      isPremium: false,
      sortOrder: 1,
      configuration: { description: 'Clean layout' },
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a minimal createTemplate payload (optionals omitted)', () => {
    const parsed = createTemplateSchema.safeParse({
      cardTypeId: 'ct-business',
      name: 'Minimal',
      slug: 'business-minimal',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid template slugs', () => {
    const invalidSlugs = [
      'Modern',
      'business_modern',
      'business modern',
      '-modern',
      'modern-',
      'a--b',
    ];

    for (const slug of invalidSlugs) {
      const parsed = createTemplateSchema.safeParse({
        cardTypeId: 'ct-business',
        name: 'Modern',
        slug,
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('rejects a missing cardTypeId, name, or slug', () => {
    expect(
      createTemplateSchema.safeParse({ name: 'Modern', slug: 'business-modern' }).success
    ).toBe(false);
    expect(
      createTemplateSchema.safeParse({ cardTypeId: 'ct', slug: 'business-modern' }).success
    ).toBe(false);
    expect(createTemplateSchema.safeParse({ cardTypeId: 'ct', name: 'Modern' }).success).toBe(
      false
    );
  });

  it('rejects a negative or non-integer sortOrder', () => {
    expect(
      createTemplateSchema.safeParse({
        cardTypeId: 'ct',
        name: 'Modern',
        slug: 'business-modern',
        sortOrder: -1,
      }).success
    ).toBe(false);

    expect(
      createTemplateSchema.safeParse({
        cardTypeId: 'ct',
        name: 'Modern',
        slug: 'business-modern',
        sortOrder: 1.5,
      }).success
    ).toBe(false);
  });

  it('validates partial updateTemplateSchema payloads', () => {
    expect(updateTemplateSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ sortOrder: 5, isPremium: true }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ thumbnail: null }).success).toBe(true);
    expect(updateTemplateSchema.safeParse({ sortOrder: -3 }).success).toBe(false);
  });

  it('treats cardType as an optional query parameter', () => {
    expect(templateListQuerySchema.safeParse({}).success).toBe(true);
    expect(templateListQuerySchema.safeParse({ cardType: 'business' }).success).toBe(true);
  });
});
