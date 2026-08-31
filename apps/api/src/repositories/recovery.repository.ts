import { prisma } from '../lib/prisma.js';

export const recoveryRepository = {
  countRecentByUserId(userId: string, windowStart: Date) {
    return prisma.accountRecoveryToken.count({
      where: {
        userId,
        createdAt: { gte: windowStart },
      },
    });
  },

  findByTokenHash(tokenHash: string) {
    return prisma.accountRecoveryToken.findFirst({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  },

  markUsed(id: string) {
    return prisma.accountRecoveryToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  async createWithInvalidation(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.$transaction([
      prisma.accountRecoveryToken.updateMany({
        where: {
          userId: data.userId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.accountRecoveryToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
        },
      }),
    ]);
  },

  deleteExpired() {
    return prisma.accountRecoveryToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },
};
