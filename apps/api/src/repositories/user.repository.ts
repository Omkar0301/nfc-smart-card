import { prisma } from "../lib/prisma.js";
import type { Role } from "@nfc-card/shared";

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

  create(data: { phone: string; name: string; role: Role }) {
    return prisma.user.create({ data });
  },
};
