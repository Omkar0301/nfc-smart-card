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

export const cardIdParamSchema = z.object({
  id: z.string().min(1, 'Card ID is required'),
});

export const listCardsQuerySchema = z.object({
  cardTypeId: z.string().optional(),
  status: z.nativeEnum(CardStatus).optional(),
  batchId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const assignCardSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const suspendCardSchema = z.object({
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

export const deactivateCardSchema = z.object({
  reason: z.string().max(500, 'Reason must not exceed 500 characters').optional(),
});

export const replaceCardSchema = z.object({
  replacementCardId: z.string().min(1, 'Replacement card ID is required'),
});

export const searchAvailableReplacementsQuerySchema = z.object({
  cardTypeId: z.string().min(1, 'Card type ID is required'),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const searchUsersQuerySchema = z.object({
  query: z.string().min(1, 'Search query must have at least 1 character'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type GenerateCardsInput = z.infer<typeof generateCardsSchema>;
export type ExportCardsQuery = z.infer<typeof exportCardsQuerySchema>;
export type ListCardsQuery = z.infer<typeof listCardsQuerySchema>;
export type AssignCardInput = z.infer<typeof assignCardSchema>;
export type SuspendCardInput = z.infer<typeof suspendCardSchema>;
export type DeactivateCardInput = z.infer<typeof deactivateCardSchema>;
export type ReplaceCardInput = z.infer<typeof replaceCardSchema>;
