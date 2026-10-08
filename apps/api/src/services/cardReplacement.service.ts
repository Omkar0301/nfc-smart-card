import { CardStatus, ErrorCode } from '@nfc-card/shared';
import { logger } from '../lib/logger.js';
import { revalidateProfileTag } from '../lib/cacheInvalidation.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { cardReplacementRepository } from '../repositories/cardReplacement.repository.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

export const cardReplacementService = {
  async reportLost(
    userId: string,
    input: { reason?: string; notes?: string }
  ): Promise<
    ServiceResult<{
      request: any;
      card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
    }>
  > {
    const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
    if (!assignment || !assignment.card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NO_ACTIVE_CARD,
        message: 'No active card assigned to your account.',
      };
    }

    const { card } = assignment;
    let finalStatus = card.status as CardStatus;

    // If card is currently ACTIVE, pause it immediately
    if (card.status === CardStatus.ACTIVE) {
      await profileRepository.updateCardStatus(card.id, CardStatus.PAUSED);
      finalStatus = CardStatus.PAUSED;

      try {
        await revalidateProfileTag(card.publicToken);
      } catch (err) {
        logger.warn({ err, token: card.publicToken }, '[reportLost] cache invalidation failed');
      }
    }

    const request = await cardReplacementRepository.createRequest({
      cardId: card.id,
      userId,
      reason: input.reason ?? 'LOST',
      notes: input.notes,
      status: 'PENDING',
    });

    logger.info(
      { userId, cardId: card.id, requestId: request.id },
      '[reportLost] card reported lost'
    );

    return {
      ok: true,
      data: {
        request,
        card: {
          id: card.id,
          cardNumber: card.cardNumber,
          publicToken: card.publicToken,
          status: finalStatus,
        },
      },
    };
  },

  async requestReplacement(
    userId: string,
    input: { reason?: string; notes?: string }
  ): Promise<ServiceResult<{ request: any; message: string }>> {
    const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
    if (!assignment || !assignment.card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NO_ACTIVE_CARD,
        message: 'No active card assigned to your account.',
      };
    }

    const { card } = assignment;

    const existingPending = await cardReplacementRepository.findPendingByCardAndUser(
      card.id,
      userId
    );
    if (existingPending) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.REQUEST_ALREADY_PENDING,
        message: 'You already have a pending replacement request for this card.',
      };
    }

    const request = await cardReplacementRepository.createRequest({
      cardId: card.id,
      userId,
      reason: input.reason ?? 'OTHER',
      notes: input.notes,
      status: 'PENDING',
    });

    logger.info(
      { userId, cardId: card.id, requestId: request.id },
      '[requestReplacement] submitted'
    );

    return {
      ok: true,
      data: {
        request,
        message: "Replacement request submitted. You'll be notified when processed.",
      },
    };
  },

  async getCustomerRequests(userId: string): Promise<ServiceResult<any[]>> {
    const requests = await cardReplacementRepository.findByUserId(userId);
    return {
      ok: true,
      data: requests,
    };
  },

  async listAllRequests(query: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceResult<{ requests: any[]; total: number; page: number; limit: number }>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      cardReplacementRepository.listAll({ status: query.status, skip, take: limit }),
      cardReplacementRepository.countAll(query.status),
    ]);

    return {
      ok: true,
      data: {
        requests,
        total,
        page,
        limit,
      },
    };
  },

  async updateRequestStatus(id: string, status: string): Promise<ServiceResult<{ request: any }>> {
    const existing = await cardReplacementRepository.findById(id);
    if (!existing) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.NOT_FOUND,
        message: 'Replacement request not found.',
      };
    }

    const resolvedAt = ['COMPLETED', 'CANCELLED'].includes(status) ? new Date() : null;
    const request = await cardReplacementRepository.updateStatus(id, status, resolvedAt);

    return {
      ok: true,
      data: { request },
    };
  },
};
