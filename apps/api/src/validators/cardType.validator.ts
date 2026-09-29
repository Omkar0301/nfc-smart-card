import { z } from 'zod';

export const FIELD_TYPES = [
  'text',
  'long_text',
  'image',
  'phone',
  'email',
  'url',
  'address',
  'list_of_strings',
  'select',
] as const;

export const fieldSchemaItemSchema = z.object({
  key: z
    .string()
    .min(1, 'Field key is required')
    .max(50, 'Field key too long')
    .regex(/^[a-z0-9_-]+$/i, 'Field key must be alphanumeric, underscores, or hyphens'),
  label: z.string().min(1, 'Field label is required').max(100, 'Field label too long'),
  type: z.enum(FIELD_TYPES, {
    errorMap: () => ({ message: 'Invalid field type' }),
  }),
  required: z.boolean(),
  defaultVisible: z.boolean(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().min(1)).optional(),
  helpText: z.string().max(500).optional(),
});

function hasUniqueKeys(fields: Array<{ key: string }>): boolean {
  const keys = new Set<string>();
  for (const field of fields) {
    const lowerKey = field.key.toLowerCase();
    if (keys.has(lowerKey)) {
      return false;
    }
    keys.add(lowerKey);
  }
  return true;
}

export const createCardTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  cardNumberPrefix: z
    .string()
    .min(1, 'Prefix must be at least 1 character')
    .max(10, 'Prefix must be 10 characters or less')
    .regex(/^[A-Za-z0-9]+$/, 'Prefix must be alphanumeric')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  fieldSchema: z
    .array(fieldSchemaItemSchema)
    .min(1, 'At least one field is required in fieldSchema')
    .refine(hasUniqueKeys, {
      message: 'Field keys must be unique within fieldSchema',
    }),
});

export const updateCardTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  fieldSchema: z
    .array(fieldSchemaItemSchema)
    .min(1, 'At least one field is required in fieldSchema')
    .refine(hasUniqueKeys, {
      message: 'Field keys must be unique within fieldSchema',
    })
    .optional(),
});

export const cardTypeIdParamSchema = z.object({
  id: z.string().min(1, 'Card type ID is required'),
});

export type CreateCardTypeInput = z.infer<typeof createCardTypeSchema>;
export type UpdateCardTypeInput = z.infer<typeof updateCardTypeSchema>;
