import { ErrorCode, type CardType, type FieldSchema } from '@nfc-card/shared';
import type { Prisma } from '@prisma/client';
import { cardTypeRepository } from '../repositories/cardType.repository.js';
import {
  FIELD_TYPES,
  type CreateCardTypeInput,
  type UpdateCardTypeInput,
} from '../validators/cardType.validator.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

function validateFieldSchema(
  fields: FieldSchema
): { valid: true } | { valid: false; code: ErrorCode; message: string; field?: string } {
  const seenKeys = new Set<string>();

  for (const field of fields) {
    const lowerKey = field.key.trim().toLowerCase();
    if (seenKeys.has(lowerKey)) {
      return {
        valid: false,
        code: ErrorCode.DUPLICATE_FIELD_KEY,
        message: `Duplicate field key: ${field.key}`,
        field: field.key,
      };
    }
    seenKeys.add(lowerKey);

    if (!FIELD_TYPES.includes(field.type as any)) {
      return {
        valid: false,
        code: ErrorCode.INVALID_FIELD_TYPE,
        message: `Invalid field type: ${field.type}`,
        field: field.key,
      };
    }
  }

  return { valid: true };
}

export const cardTypeService = {
  async listCardTypes(): Promise<ServiceResult<{ cardTypes: CardType[] }>> {
    const rawCardTypes = await cardTypeRepository.findAll();
    const cardTypes = rawCardTypes.map((ct) => ({
      ...ct,
      fieldSchema: ct.fieldSchema as unknown as FieldSchema,
    })) as CardType[];

    return {
      ok: true,
      data: { cardTypes },
    };
  },

  async getCardTypeById(id: string): Promise<ServiceResult<{ cardType: CardType }>> {
    const ct = await cardTypeRepository.findById(id);
    if (!ct) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NOT_FOUND,
        message: 'Card type not found.',
      };
    }

    const cardType = {
      ...ct,
      fieldSchema: ct.fieldSchema as unknown as FieldSchema,
    } as CardType;

    return {
      ok: true,
      data: { cardType },
    };
  },

  async createCardType(input: CreateCardTypeInput): Promise<ServiceResult<{ cardType: CardType }>> {
    const existing = await cardTypeRepository.findBySlug(input.slug.toLowerCase().trim());
    if (existing) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.SLUG_EXISTS,
        message: `Card type with slug '${input.slug}' already exists.`,
      };
    }

    const schemaValidation = validateFieldSchema(input.fieldSchema as FieldSchema);
    if (!schemaValidation.valid) {
      return {
        ok: false,
        status: 400,
        code: schemaValidation.code,
        message: schemaValidation.message,
        details: schemaValidation.field ? { field: schemaValidation.field } : undefined,
      };
    }

    const prefix = (
      input.cardNumberPrefix?.trim().toUpperCase() ||
      input.slug
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 2)
        .toUpperCase()
    ).slice(0, 10);

    const existingPrefix = await cardTypeRepository.findByPrefix(prefix);
    if (existingPrefix) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CONFLICT,
        message: `Card type with prefix '${prefix}' already exists.`,
      };
    }

    const created = await cardTypeRepository.create({
      name: input.name.trim(),
      slug: input.slug.toLowerCase().trim(),
      cardNumberPrefix: prefix,
      description: input.description?.trim() || null,
      fieldSchema: input.fieldSchema as unknown as Prisma.InputJsonValue,
      status: 'ACTIVE',
    });

    const cardType = {
      ...created,
      fieldSchema: created.fieldSchema as unknown as FieldSchema,
    } as CardType;

    return {
      ok: true,
      data: { cardType },
    };
  },

  async updateCardType(
    id: string,
    input: UpdateCardTypeInput
  ): Promise<ServiceResult<{ cardType: CardType; warning?: string }>> {
    const existing = await cardTypeRepository.findById(id);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NOT_FOUND,
        message: 'Card type not found.',
      };
    }

    if (input.fieldSchema) {
      const schemaValidation = validateFieldSchema(input.fieldSchema as FieldSchema);
      if (!schemaValidation.valid) {
        return {
          ok: false,
          status: 400,
          code: schemaValidation.code,
          message: schemaValidation.message,
          details: schemaValidation.field ? { field: schemaValidation.field } : undefined,
        };
      }
    }

    const cardCount = await cardTypeRepository.countCardsByCardTypeId(id);
    let warning: string | undefined;

    if (input.status === 'INACTIVE' && cardCount > 0) {
      warning = `${cardCount} active cards exist for this type`;
    }

    const updateData: {
      name?: string;
      description?: string | null;
      fieldSchema?: Prisma.InputJsonValue;
      status?: string;
    } = {};

    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    if (input.description !== undefined) {
      updateData.description = input.description ? input.description.trim() : null;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.fieldSchema !== undefined) {
      updateData.fieldSchema = input.fieldSchema as unknown as Prisma.InputJsonValue;
    }

    const updated = await cardTypeRepository.update(id, updateData);

    const cardType = {
      ...updated,
      fieldSchema: updated.fieldSchema as unknown as FieldSchema,
    } as CardType;

    return {
      ok: true,
      data: {
        cardType,
        ...(warning ? { warning } : {}),
      },
    };
  },
};
