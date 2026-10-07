import { z } from 'zod';

export const templateListQuerySchema = z.object({
  cardType: z.string().min(1, 'cardType query parameter is required').optional(),
});

export const templateIdParamSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
});

export const createTemplateSchema = z.object({
  cardTypeId: z.string().min(1, 'cardTypeId is required'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60, 'Slug must be 60 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  thumbnail: z.string().max(500, 'Thumbnail URL too long').nullable().optional(),
  isActive: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  configuration: z.record(z.unknown()).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
  thumbnail: z.string().max(500, 'Thumbnail URL too long').nullable().optional(),
  isActive: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  configuration: z.record(z.unknown()).optional(),
});

export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
