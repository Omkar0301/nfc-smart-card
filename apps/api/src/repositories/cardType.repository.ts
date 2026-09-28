import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const cardTypeRepository = {
  findAll() {
    return prisma.cardType.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.cardType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  },

  findBySlug(slug: string) {
    return prisma.cardType.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  },

  create(data: {
    name: string;
    slug: string;
    description?: string | null;
    fieldSchema: Prisma.InputJsonValue;
    status?: string;
  }) {
    return prisma.cardType.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        fieldSchema: data.fieldSchema,
        status: data.status ?? 'ACTIVE',
      },
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  },

  update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      fieldSchema?: Prisma.InputJsonValue;
      status?: string;
    }
  ) {
    return prisma.cardType.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { cards: true },
        },
      },
    });
  },

  countCardsByCardTypeId(cardTypeId: string) {
    return prisma.nFCCard.count({
      where: { cardTypeId },
    });
  },
};
