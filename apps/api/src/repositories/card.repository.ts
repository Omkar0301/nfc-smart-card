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

  findById(id: string) {
    return prisma.nFCCard.findUnique({
      where: { id },
      include: {
        cardType: true,
      },
    });
  },

  findCardDetailById(id: string) {
    return prisma.nFCCard.findUnique({
      where: { id },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
            status: true,
          },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
              },
            },
          },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
  },

  async findCards(filters: {
    cardTypeId?: string;
    status?: CardStatus;
    batchId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

    if (filters.cardTypeId) {
      where.cardTypeId = filters.cardTypeId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { cardNumber: { contains: q, mode: 'insensitive' } },
        { publicToken: { contains: q, mode: 'insensitive' } },
        {
          assignments: {
            some: {
              status: 'ACTIVE',
              user: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { phone: { contains: q } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    const [total, cards] = await Promise.all([
      prisma.nFCCard.count({ where }),
      prisma.nFCCard.findMany({
        where,
        skip,
        take,
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
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
    ]);

    return {
      cards,
      total,
      page: filters.page,
      limit: filters.limit,
    };
  },

  findActiveAssignmentByUserIdAndCardTypeId(userId: string, cardTypeId: string) {
    return prisma.cardAssignment.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        card: {
          cardTypeId,
          status: {
            not: CardStatus.DEACTIVATED,
          },
        },
      },
      include: {
        card: true,
      },
    });
  },

  findActiveAssignmentByCardId(cardId: string) {
    return prisma.cardAssignment.findFirst({
      where: {
        cardId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
      },
    });
  },

  findAvailableReplacementCards(
    cardTypeId: string,
    excludeCardId: string,
    search?: string,
    limit = 20
  ) {
    const where: any = {
      cardTypeId,
      id: { not: excludeCardId },
      status: CardStatus.AVAILABLE,
    };

    if (search && search.trim()) {
      where.cardNumber = { contains: search.trim(), mode: 'insensitive' };
    }

    return prisma.nFCCard.findMany({
      where,
      select: {
        id: true,
        cardNumber: true,
        publicToken: true,
        batchId: true,
        status: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { cardNumber: 'asc' },
    });
  },

  updateStatus(cardId: string, status: CardStatus) {
    return prisma.nFCCard.update({
      where: { id: cardId },
      data: { status },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  },

  assignCardTransaction(cardId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.nFCCard.update({
        where: { id: cardId },
        data: { status: CardStatus.ASSIGNED },
        include: {
          cardType: true,
        },
      });

      const assignment = await tx.cardAssignment.create({
        data: {
          cardId,
          userId,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
        include: {
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

      return {
        card,
        assignment,
      };
    });
  },

  deactivateCardTransaction(cardId: string) {
    return prisma.$transaction(async (tx) => {
      const card = await tx.nFCCard.update({
        where: { id: cardId },
        data: { status: CardStatus.DEACTIVATED },
        include: {
          cardType: true,
        },
      });

      await tx.cardAssignment.updateMany({
        where: {
          cardId,
          status: 'ACTIVE',
        },
        data: {
          status: 'INACTIVE',
          unassignedAt: new Date(),
        },
      });

      return card;
    });
  },

  replaceCardTransaction(params: {
    oldCardId: string;
    replacementCardId: string;
    userId: string;
    newCardStatus: CardStatus;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Deactivate old card
      const oldCard = await tx.nFCCard.update({
        where: { id: params.oldCardId },
        data: { status: CardStatus.DEACTIVATED },
      });

      // 2. Inactivate previous active assignment
      await tx.cardAssignment.updateMany({
        where: {
          cardId: params.oldCardId,
          status: 'ACTIVE',
        },
        data: {
          status: 'INACTIVE',
          unassignedAt: new Date(),
        },
      });

      // 3. Set replacement card status
      const newCard = await tx.nFCCard.update({
        where: { id: params.replacementCardId },
        data: { status: params.newCardStatus },
        include: {
          cardType: true,
        },
      });

      // 4. Create new assignment for the replacement card
      const assignment = await tx.cardAssignment.create({
        data: {
          cardId: params.replacementCardId,
          userId: params.userId,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
        include: {
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

      return {
        oldCard,
        newCard,
        assignment,
      };
    });
  },

  findByPublicToken(publicToken: string) {
    return prisma.nFCCard.findUnique({
      where: { publicToken },
      include: {
        cardType: {
          select: {
            id: true,
            name: true,
            slug: true,
            cardNumberPrefix: true,
            status: true,
          },
        },
      },
    });
  },

  claimCardTransaction(params: { cardId: string; userId: string; cardTypeId: string }) {
    return prisma.$transaction(async (tx) => {
      // 1. Transactional row lock with SELECT ... FOR UPDATE (Prisma interactive transaction)
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          status: CardStatus;
          cardTypeId: string;
        }>
      >`SELECT id, status, "cardTypeId" FROM "NFCCard" WHERE id = ${params.cardId} FOR UPDATE`;

      if (!rows || rows.length === 0) {
        throw new Error('CARD_NOT_FOUND');
      }

      if (rows[0].status !== CardStatus.AVAILABLE) {
        throw new Error('CARD_ALREADY_CLAIMED');
      }

      // 2. Set card status to ASSIGNED
      const card = await tx.nFCCard.update({
        where: { id: params.cardId },
        data: { status: CardStatus.ASSIGNED },
        include: {
          cardType: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // 3. Create card assignment
      const assignment = await tx.cardAssignment.create({
        data: {
          cardId: params.cardId,
          userId: params.userId,
          status: 'ACTIVE',
          assignedAt: new Date(),
        },
      });

      // 4. Initialize draft profile
      const profile = await tx.profile.create({
        data: {
          userId: params.userId,
          cardTypeId: params.cardTypeId,
          data: {},
          fieldVisibility: {},
          status: 'draft',
        },
      });

      return {
        card,
        assignment,
        profile,
      };
    });
  },
};
