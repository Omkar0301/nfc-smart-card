import { prisma } from '../lib/prisma.js';

export interface CreateGenerationJobData {
  id?: string;
  batchId: string;
  cardTypeId: string;
  requestedBy: string;
  quantity: number;
  status?: string;
}

export const generationJobRepository = {
  create(data: CreateGenerationJobData) {
    return prisma.generationJob.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        batchId: data.batchId,
        cardTypeId: data.cardTypeId,
        requestedBy: data.requestedBy,
        quantity: data.quantity,
        status: data.status ?? 'PENDING',
      },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
          },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.generationJob.findUnique({
      where: { id },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
          },
        },
      },
    });
  },

  findByBatchId(batchId: string) {
    return prisma.generationJob.findUnique({
      where: { batchId },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
          },
        },
      },
    });
  },

  updateProgress(id: string, generated: number) {
    return prisma.generationJob.update({
      where: { id },
      data: { generated },
    });
  },

  updateStatus(
    id: string,
    status: string,
    options?: {
      startedAt?: Date | null;
      completedAt?: Date | null;
      errorMessage?: string | null;
      generated?: number;
    }
  ) {
    return prisma.generationJob.update({
      where: { id },
      data: {
        status,
        ...(options?.startedAt !== undefined ? { startedAt: options.startedAt } : {}),
        ...(options?.completedAt !== undefined ? { completedAt: options.completedAt } : {}),
        ...(options?.errorMessage !== undefined ? { errorMessage: options.errorMessage } : {}),
        ...(options?.generated !== undefined ? { generated: options.generated } : {}),
      },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
          },
        },
      },
    });
  },

  listRecentJobs(limit = 20) {
    return prisma.generationJob.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
          },
        },
      },
    });
  },
};
