import { prisma } from '../lib/prisma.js';
import { CardStatus } from '@prisma/client';

export interface CreateCardData {
  cardNumber: string;
  publicToken: string;
  cardTypeId: string;
  batchId: string;
  status?: CardStatus;
}

export const cardRepository = {
  findHighestCardNumber(cardTypeId: string, prefix: string) {
    return prisma.nFCCard.findFirst({
      where: {
        cardTypeId,
        cardNumber: {
          startsWith: `${prefix}-`,
        },
      },
      orderBy: {
        cardNumber: 'desc',
      },
      select: {
        cardNumber: true,
      },
    });
  },

  createCard(data: CreateCardData) {
    return prisma.nFCCard.create({
      data: {
        cardNumber: data.cardNumber,
        publicToken: data.publicToken,
        cardTypeId: data.cardTypeId,
        batchId: data.batchId,
        status: data.status ?? CardStatus.AVAILABLE,
      },
    });
  },

  createManyCards(cards: CreateCardData[]) {
    return prisma.nFCCard.createMany({
      data: cards.map((c) => ({
        cardNumber: c.cardNumber,
        publicToken: c.publicToken,
        cardTypeId: c.cardTypeId,
        batchId: c.batchId,
        status: c.status ?? CardStatus.AVAILABLE,
      })),
      skipDuplicates: false,
    });
  },

  countByBatchId(batchId: string) {
    return prisma.nFCCard.count({
      where: { batchId },
    });
  },

  findByBatchId(batchId: string) {
    return prisma.nFCCard.findMany({
      where: { batchId },
    });
  },

  invalidateDefectiveBatch(batchId: string) {
    return prisma.nFCCard.updateMany({
      where: {
        batchId,
        status: CardStatus.AVAILABLE,
      },
      data: {
        status: CardStatus.DEACTIVATED,
      },
    });
  },

  countSkippedByBatchId(batchId: string) {
    return prisma.nFCCard.count({
      where: {
        batchId,
        status: {
          in: [CardStatus.ASSIGNED, CardStatus.ACTIVE, CardStatus.PAUSED, CardStatus.SUSPENDED],
        },
      },
    });
  },

  findCardsForExport(filters: { cardTypeId?: string; status?: CardStatus; batchId?: string }) {
    return prisma.nFCCard.findMany({
      where: {
        ...(filters.cardTypeId ? { cardTypeId: filters.cardTypeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.batchId ? { batchId: filters.batchId } : {}),
      },
      include: {
        cardType: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },
};
