import { describe, it, expect } from 'vitest';
import {
  generateCardsSchema,
  jobIdParamSchema,
  batchIdParamSchema,
  exportCardsQuerySchema,
} from '../../src/validators/card.validator.js';

describe('Card Validators Unit Tests', () => {
  it('validates generateCards input correctly', () => {
    const valid = generateCardsSchema.safeParse({
      cardTypeId: 'cuid123',
      quantity: 50,
    });
    expect(valid.success).toBe(true);

    const invalidQtyLow = generateCardsSchema.safeParse({
      cardTypeId: 'cuid123',
      quantity: 0,
    });
    expect(invalidQtyLow.success).toBe(false);

    const invalidQtyHigh = generateCardsSchema.safeParse({
      cardTypeId: 'cuid123',
      quantity: 10001,
    });
    expect(invalidQtyHigh.success).toBe(false);

    const invalidType = generateCardsSchema.safeParse({
      cardTypeId: '',
      quantity: 10,
    });
    expect(invalidType.success).toBe(false);
  });

  it('validates jobId and batchId param schemas', () => {
    expect(jobIdParamSchema.safeParse({ id: 'job-123' }).success).toBe(true);
    expect(jobIdParamSchema.safeParse({ id: '' }).success).toBe(false);

    expect(batchIdParamSchema.safeParse({ batchId: 'batch-123' }).success).toBe(true);
    expect(batchIdParamSchema.safeParse({ batchId: '' }).success).toBe(false);
  });

  it('validates exportCardsQuerySchema', () => {
    expect(exportCardsQuerySchema.safeParse({}).success).toBe(true);
    expect(
      exportCardsQuerySchema.safeParse({ cardTypeId: 'ct-1', status: 'AVAILABLE' }).success
    ).toBe(true);
    expect(exportCardsQuerySchema.safeParse({ status: 'INVALID_STATUS' }).success).toBe(false);
  });
});
