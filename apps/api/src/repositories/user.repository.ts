import { prisma } from '../lib/prisma.js';
import type { Role } from '@nfc-card/shared';

export const userRepository = {
  findByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByIdWithAuthFields(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
  },

  findMeById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
      },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  updatePhone(id: string, phone: string) {
    return prisma.user.update({
      where: { id },
      data: { phone },
    });
  },

  updateEmail(id: string, email: string | null) {
    return prisma.user.update({
      where: { id },
      data: { email },
    });
  },

  create(data: { phone: string; name: string; role: Role; email?: string | null }) {
    return prisma.user.create({ data });
  },

  searchUsers(query: string, limit = 10) {
    return prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  listCustomers(query?: string, limit = 50) {
    return prisma.user.findMany({
      where:
        query && query.trim()
          ? {
              OR: [
                { name: { contains: query.trim(), mode: 'insensitive' } },
                { phone: { contains: query.trim() } },
                { email: { contains: query.trim(), mode: 'insensitive' } },
              ],
            }
          : undefined,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            card: {
              include: {
                cardType: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        profiles: {
          select: {
            id: true,
            status: true,
            cardType: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },
};
