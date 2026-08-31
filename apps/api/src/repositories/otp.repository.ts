import { prisma } from '../lib/prisma.js';

export const otpRepository = {
  countRecent(phone: string, windowStart: Date) {
    return prisma.otpVerification.count({
      where: { phone, createdAt: { gte: windowStart } },
    });
  },

  findLatestByPhone(phone: string) {
    return prisma.otpVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
  },

  deleteExpired() {
    return prisma.otpVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },

  incrementAttempts(id: string, attempts: number) {
    return prisma.otpVerification.update({
      where: { id },
      data: { attempts },
    });
  },

  markUsed(id: string) {
    return prisma.otpVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  async createWithInvalidation(data: { phone: string; codeHash: string; expiresAt: Date }) {
    return prisma.$transaction([
      prisma.otpVerification.updateMany({
        where: { phone: data.phone, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.otpVerification.create({
        data: { phone: data.phone, codeHash: data.codeHash, expiresAt: data.expiresAt },
      }),
    ]);
  },
};
