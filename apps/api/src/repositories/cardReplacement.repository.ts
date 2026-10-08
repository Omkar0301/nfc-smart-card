import { prisma } from '../lib/prisma.js';

export const cardReplacementRepository = {
  createRequest(data: {
    cardId: string;
    userId: string;
    reason?: string | null;
    notes?: string | null;
    status?: string;
  }) {
    return prisma.cardReplacementRequest.create({
      data: {
        cardId: data.cardId,
        userId: data.userId,
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        status: data.status ?? 'PENDING',
      },
      include: {
        card: {
          select: {
            cardNumber: true,
            publicToken: true,
            status: true,
          },
        },
      },
    });
  },

  findPendingByCardAndUser(cardId: string, userId: string) {
    return prisma.cardReplacementRequest.findFirst({
      where: {
        cardId,
        userId,
        status: 'PENDING',
      },
    });
  },

  findByUserId(userId: string) {
    return prisma.cardReplacementRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        card: {
          select: {
            cardNumber: true,
            publicToken: true,
            status: true,
          },
        },
      },
    });
  },

  listAll(params: { status?: string; skip?: number; take?: number }) {
    const where = params.status ? { status: params.status } : {};
    return prisma.cardReplacementRequest.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        card: {
          select: {
            cardNumber: true,
            publicToken: true,
            status: true,
            cardType: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  },

  countAll(status?: string) {
    const where = status ? { status } : {};
    return prisma.cardReplacementRequest.count({ where });
  },

  findById(id: string) {
    return prisma.cardReplacementRequest.findUnique({
      where: { id },
      include: {
        card: true,
        user: true,
      },
    });
  },

  updateStatus(id: string, status: string, resolvedAt?: Date | null) {
    return prisma.cardReplacementRequest.update({
      where: { id },
      data: {
        status,
        ...(resolvedAt !== undefined ? { resolvedAt } : {}),
      },
    });
  },
};
