import { prisma } from "../lib/prisma.js";

export const tokenRepository = {
  createPending(userId: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: "pending",
        expiresAt,
      },
    });
  },

  updateHash(id: string, tokenHash: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { tokenHash },
    });
  },

  findById(id: string) {
    return prisma.refreshToken.findUnique({ where: { id } });
  },

  revokeById(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },
};
