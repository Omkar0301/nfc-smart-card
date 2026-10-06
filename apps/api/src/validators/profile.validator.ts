import { z } from 'zod';

export const updateProfileSchema = z.object({
  data: z.record(z.unknown()).optional(),
  fieldVisibility: z.record(z.boolean()).optional(),
  publish: z.boolean().optional(),
  templateId: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const profileTokenParamSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type ProfileTokenParam = z.infer<typeof profileTokenParamSchema>;
