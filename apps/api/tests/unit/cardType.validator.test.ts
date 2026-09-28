import { describe, it, expect } from 'vitest';
import {
  createCardTypeSchema,
  updateCardTypeSchema,
} from '../../src/validators/cardType.validator.js';

describe('CardType Validator Unit Tests', () => {
  const validFieldSchema = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text' as const,
      required: true,
      defaultVisible: true,
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email' as const,
      required: false,
      defaultVisible: true,
    },
  ];

  it('validates a valid createCardType payload', () => {
    const payload = {
      name: 'Doctor Profile',
      slug: 'doctor',
      description: 'Card for medical professionals',
      fieldSchema: validFieldSchema,
    };

    const parsed = createCardTypeSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid slug format', () => {
    const invalidSlugs = ['Doctor', 'doc_tor', 'doc tor', '-doctor', 'doctor-', 'doc--tor', 'DOC'];

    for (const slug of invalidSlugs) {
      const parsed = createCardTypeSchema.safeParse({
        name: 'Doctor Card',
        slug,
        fieldSchema: validFieldSchema,
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('rejects fieldSchema with invalid field type', () => {
    const parsed = createCardTypeSchema.safeParse({
      name: 'Custom Card',
      slug: 'custom',
      fieldSchema: [
        {
          key: 'custom_field',
          label: 'Custom',
          type: 'unsupported_type',
          required: false,
          defaultVisible: true,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects fieldSchema with duplicate field keys', () => {
    const parsed = createCardTypeSchema.safeParse({
      name: 'Custom Card',
      slug: 'custom',
      fieldSchema: [
        {
          key: 'phone',
          label: 'Phone',
          type: 'phone',
          required: false,
          defaultVisible: true,
        },
        {
          key: 'PHONE',
          label: 'Second Phone',
          type: 'phone',
          required: false,
          defaultVisible: true,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects empty fieldSchema', () => {
    const parsed = createCardTypeSchema.safeParse({
      name: 'Custom Card',
      slug: 'custom',
      fieldSchema: [],
    });

    expect(parsed.success).toBe(false);
  });

  it('validates updateCardTypeSchema with partial updates', () => {
    const parsed1 = updateCardTypeSchema.safeParse({
      name: 'Updated Name',
      status: 'INACTIVE',
    });
    expect(parsed1.success).toBe(true);

    const parsed2 = updateCardTypeSchema.safeParse({
      fieldSchema: validFieldSchema,
    });
    expect(parsed2.success).toBe(true);
  });
});
