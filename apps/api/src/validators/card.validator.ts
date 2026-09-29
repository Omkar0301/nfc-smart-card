import { z } from 'zod';
import { CardStatus } from '@prisma/client';

export const generateCardsSchema = z.object({
  cardTypeId: z.string().min(1, 'cardTypeId is required'),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity cannot exceed 10,000'),
});

export const jobIdParamSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
});

export const batchIdParamSchema = z.object({
  batchId: z.string().min(1, 'Batch ID is required'),
});

export const exportCardsQuerySchema = z.object({
  cardTypeId: z.string().optional(),
  status: z.nativeEnum(CardStatus).optional(),
  batchId: z.string().optional(),
});

export type GenerateCardsInput = z.infer<typeof generateCardsSchema>;
export type ExportCardsQuery = z.infer<typeof exportCardsQuerySchema>;
