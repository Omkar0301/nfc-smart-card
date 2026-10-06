import { CardStatus } from '@nfc-card/shared';
import { prisma } from '../lib/prisma.js';

export const profileRepository = {
  findActiveAssignmentByUserId(userId: string) {
    return prisma.cardAssignment.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        card: {
          include: {
            cardType: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  },

  findProfileByUserIdAndCardTypeId(userId: string, cardTypeId: string) {
    return prisma.profile.findFirst({
      where: {
        userId,
        cardTypeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  createDraftProfile(params: {
    userId: string;
    cardTypeId: string;
    data?: Record<string, unknown>;
    fieldVisibility?: Record<string, boolean>;
    status?: string;
  }) {
    return prisma.profile.create({
      data: {
        userId: params.userId,
        cardTypeId: params.cardTypeId,
        data: (params.data ?? {}) as any,
        fieldVisibility: (params.fieldVisibility ?? {}) as any,
        status: params.status ?? 'draft',
      },
    });
  },

  updateProfile(
    id: string,
    params: {
      data?: Record<string, unknown>;
      fieldVisibility?: Record<string, boolean>;
      status?: string;
      templateId?: string | null;
    }
  ) {
    return prisma.profile.update({
      where: { id },
      data: {
        ...(params.data !== undefined ? { data: params.data as any } : {}),
        ...(params.fieldVisibility !== undefined
          ? { fieldVisibility: params.fieldVisibility as any }
          : {}),
        ...(params.status !== undefined ? { status: params.status } : {}),
        ...(params.templateId !== undefined ? { templateId: params.templateId } : {}),
      },
    });
  },

  saveAndPublishTransaction(params: {
    profileId: string;
    cardId: string;
    data: Record<string, unknown>;
    fieldVisibility: Record<string, boolean>;
    templateId?: string | null;
    shouldActivateCard: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.profile.update({
        where: { id: params.profileId },
        data: {
          status: 'published',
          data: params.data as any,
          fieldVisibility: params.fieldVisibility as any,
          ...(params.templateId !== undefined ? { templateId: params.templateId } : {}),
        },
      });

      let updatedCard = null;
      if (params.shouldActivateCard) {
        updatedCard = await tx.nFCCard.update({
          where: { id: params.cardId },
          data: { status: CardStatus.ACTIVE },
        });
      }

      return {
        profile: updatedProfile,
        card: updatedCard,
      };
    });
  },

  saveAndUnpublishTransaction(params: {
    profileId: string;
    cardId: string;
    data: Record<string, unknown>;
    fieldVisibility: Record<string, boolean>;
    templateId?: string | null;
    shouldAssignCard: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.profile.update({
        where: { id: params.profileId },
        data: {
          status: 'draft',
          data: params.data as any,
          fieldVisibility: params.fieldVisibility as any,
          ...(params.templateId !== undefined ? { templateId: params.templateId } : {}),
        },
      });

      let updatedCard = null;
      if (params.shouldAssignCard) {
        updatedCard = await tx.nFCCard.update({
          where: { id: params.cardId },
          data: { status: CardStatus.ASSIGNED },
        });
      }

      return {
        profile: updatedProfile,
        card: updatedCard,
      };
    });
  },

  findByPublicTokenWithActiveProfile(publicToken: string) {
    return prisma.nFCCard.findUnique({
      where: { publicToken },
      include: {
        cardType: true,
        assignments: {
          where: { status: 'ACTIVE' },
          orderBy: { assignedAt: 'desc' },
          take: 1,
          include: {
            user: {
              include: {
                profiles: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });
  },
};
