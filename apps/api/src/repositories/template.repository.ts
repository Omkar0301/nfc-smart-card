import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const cardTypeSummary = { select: { slug: true, name: true } } as const;

export const templateRepository = {
  findActiveByCardTypeSlug(cardTypeSlug: string) {
    return prisma.template.findMany({
      where: {
        isActive: true,
        cardType: { slug: cardTypeSlug, status: 'ACTIVE' },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { cardType: cardTypeSummary },
    });
  },

  findAll() {
    return prisma.template.findMany({
      orderBy: [{ cardTypeId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { cardType: cardTypeSummary },
    });
  },

  findById(id: string) {
    return prisma.template.findUnique({
      where: { id },
      include: { cardType: cardTypeSummary },
    });
  },

  findByCardTypeIdAndSlug(cardTypeId: string, slug: string) {
    return prisma.template.findFirst({
      where: { cardTypeId, slug },
    });
  },

  countByCardTypeId(cardTypeId: string) {
    return prisma.template.count({ where: { cardTypeId } });
  },

  countProfilesByTemplateId(templateId: string) {
    return prisma.profile.count({ where: { templateId } });
  },

  create(data: {
    cardTypeId: string;
    name: string;
    slug: string;
    thumbnail?: string | null;
    isActive: boolean;
    isPremium: boolean;
    sortOrder: number;
    configuration: Prisma.InputJsonValue;
  }) {
    return prisma.template.create({
      data: {
        cardTypeId: data.cardTypeId,
        name: data.name,
        slug: data.slug,
        thumbnail: data.thumbnail ?? null,
        isActive: data.isActive,
        isPremium: data.isPremium,
        sortOrder: data.sortOrder,
        configuration: data.configuration,
      },
      include: { cardType: cardTypeSummary },
    });
  },

  update(
    id: string,
    data: {
      name?: string;
      thumbnail?: string | null;
      isActive?: boolean;
      isPremium?: boolean;
      sortOrder?: number;
      configuration?: Prisma.InputJsonValue;
    }
  ) {
    return prisma.template.update({
      where: { id },
      data,
      include: { cardType: cardTypeSummary },
    });
  },

  delete(id: string) {
    return prisma.template.delete({ where: { id } });
  },
};
