import { z } from 'zod';

export const templateThumbnailSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
});

export type TemplateThumbnailInput = z.infer<typeof templateThumbnailSchema>;
