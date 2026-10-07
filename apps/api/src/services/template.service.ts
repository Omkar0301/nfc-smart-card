import { ErrorCode, type TemplateSummary } from '@nfc-card/shared';
import type { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { cardTypeRepository } from '../repositories/cardType.repository.js';
import { templateRepository } from '../repositories/template.repository.js';
import type { CreateTemplateInput, UpdateTemplateInput } from '../validators/template.validator.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

type TemplateRow = {
  id: string;
  cardTypeId: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
  configuration: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  cardType?: { slug: string; name: string } | null;
};

function toSummary(row: TemplateRow): TemplateSummary {
  return {
    id: row.id,
    cardTypeId: row.cardTypeId,
    cardTypeSlug: row.cardType?.slug,
    name: row.name,
    slug: row.slug,
    thumbnail: row.thumbnail,
    isActive: row.isActive,
    isPremium: row.isPremium,
    sortOrder: row.sortOrder,
    configuration: (row.configuration as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const templateService = {
  /** Public listing for a card type (PRD §22: GET /templates?cardType=:slug). */
  async listTemplatesForCardType(
    cardTypeSlug: string
  ): Promise<ServiceResult<{ templates: TemplateSummary[] }>> {
    const cardType = await cardTypeRepository.findBySlug(cardTypeSlug.toLowerCase().trim());
    if (!cardType) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_TYPE_NOT_FOUND,
        message: `Card type '${cardTypeSlug}' was not found.`,
      };
    }

    const rows = await templateRepository.findActiveByCardTypeSlug(cardType.slug);
    return { ok: true, data: { templates: rows.map((r) => toSummary(r as TemplateRow)) } };
  },

  /** Admin listing — includes inactive templates across every card type. */
  async listAllTemplates(): Promise<ServiceResult<{ templates: TemplateSummary[] }>> {
    const rows = await templateRepository.findAll();
    return { ok: true, data: { templates: rows.map((r) => toSummary(r as TemplateRow)) } };
  },

  async createTemplate(
    input: CreateTemplateInput
  ): Promise<ServiceResult<{ template: TemplateSummary }>> {
    const cardType = await cardTypeRepository.findById(input.cardTypeId);
    if (!cardType) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_TYPE_NOT_FOUND,
        message: 'Card type not found.',
      };
    }

    const slug = input.slug.toLowerCase().trim();
    const existing = await templateRepository.findByCardTypeIdAndSlug(cardType.id, slug);
    if (existing) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.TEMPLATE_SLUG_EXISTS,
        message: `A template with slug '${slug}' already exists for this card type.`,
      };
    }

    const sortOrder =
      input.sortOrder ?? (await templateRepository.countByCardTypeId(cardType.id)) + 1;

    const created = await templateRepository.create({
      cardTypeId: cardType.id,
      name: input.name.trim(),
      slug,
      thumbnail: input.thumbnail ?? null,
      isActive: input.isActive ?? true,
      isPremium: input.isPremium ?? false,
      sortOrder,
      configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
    });

    logger.info({ templateId: created.id, cardTypeId: cardType.id }, '[template] template created');

    return { ok: true, data: { template: toSummary(created as TemplateRow) } };
  },

  async updateTemplate(
    id: string,
    input: UpdateTemplateInput
  ): Promise<ServiceResult<{ template: TemplateSummary }>> {
    const existing = await templateRepository.findById(id);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.TEMPLATE_NOT_FOUND,
        message: 'Template not found.',
      };
    }

    const data: Parameters<typeof templateRepository.update>[1] = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.thumbnail !== undefined) data.thumbnail = input.thumbnail;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isPremium !== undefined) data.isPremium = input.isPremium;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.configuration !== undefined) {
      data.configuration = input.configuration as Prisma.InputJsonValue;
    }

    const updated = await templateRepository.update(id, data);

    logger.info({ templateId: id }, '[template] template updated');

    return { ok: true, data: { template: toSummary(updated as TemplateRow) } };
  },

  /**
   * Delete a template. If any profile still references it, soft-deactivate
   * instead so we never break an existing public profile (F-009 business rule).
   */
  async deleteTemplate(
    id: string
  ): Promise<ServiceResult<{ template: TemplateSummary; deactivated: boolean; warning?: string }>> {
    const existing = await templateRepository.findById(id);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.TEMPLATE_NOT_FOUND,
        message: 'Template not found.',
      };
    }

    const profileCount = await templateRepository.countProfilesByTemplateId(id);

    if (profileCount > 0) {
      const updated = await templateRepository.update(id, { isActive: false });
      logger.info({ templateId: id, profileCount }, '[template] template soft-deactivated');

      return {
        ok: true,
        data: {
          template: toSummary(updated as TemplateRow),
          deactivated: true,
          warning: `${profileCount} profile(s) still use this template; it was deactivated instead of deleted.`,
        },
      };
    }

    await templateRepository.delete(id);
    logger.info({ templateId: id }, '[template] template deleted');

    return {
      ok: true,
      data: { template: toSummary(existing as TemplateRow), deactivated: false },
    };
  },
};
