import {
  CardStatus,
  ErrorCode,
  type ClaimCardResponse,
  type PublicCardLookupResponse,
} from '@nfc-card/shared';
import { logger } from '../lib/logger.js';
import { cardRepository } from '../repositories/card.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { revalidateProfileTag } from '../lib/cacheInvalidation.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

export const claimService = {
  async lookupCardByToken(token: string): Promise<ServiceResult<PublicCardLookupResponse>> {
    const card = await cardRepository.findByPublicToken(token);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status === CardStatus.AVAILABLE) {
      return {
        ok: true,
        data: {
          status: card.status as unknown as CardStatus,
          cardType: {
            slug: card.cardType.slug,
            name: card.cardType.name,
          },
        },
      };
    }

    if (card.status === CardStatus.ACTIVE) {
      return {
        ok: true,
        data: {
          status: card.status as unknown as CardStatus,
          publicToken: card.publicToken,
          cardType: {
            slug: card.cardType.slug,
            name: card.cardType.name,
          },
        },
      };
    }

    // ASSIGNED, PAUSED, SUSPENDED, DEACTIVATED
    return {
      ok: true,
      data: {
        status: card.status as unknown as CardStatus,
      },
    };
  },

  async claimCard(token: string, userId: string): Promise<ServiceResult<ClaimCardResponse>> {
    // 1. Initial existence check
    const card = await cardRepository.findByPublicToken(token);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    // 2. Pre-check status availability
    if (card.status !== CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_NOT_AVAILABLE,
        message: 'This card is no longer available for claiming.',
        details: { status: card.status },
      };
    }

    // 3. User verification
    const user = await userRepository.findById(userId);
    if (!user) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.USER_NOT_FOUND,
        message: 'User account not found.',
      };
    }

    if (user.status === 'SUSPENDED') {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.ACCOUNT_SUSPENDED,
        message: 'Account is suspended.',
      };
    }

    if (user.status === 'DEACTIVATED') {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.FORBIDDEN,
        message: 'Account is deactivated.',
      };
    }

    // 4. One user, one active card per card type
    const existingAssignment = await cardRepository.findActiveAssignmentByUserIdAndCardTypeId(
      userId,
      card.cardTypeId
    );

    if (existingAssignment) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.USER_ALREADY_HAS_CARD,
        message: 'You already have an active card of this type.',
      };
    }

    // 5. Transactional row-locked claim
    try {
      const result = await cardRepository.claimCardTransaction({
        cardId: card.id,
        userId,
        cardTypeId: card.cardTypeId,
      });

      logger.info(
        {
          cardId: result.card.id,
          cardNumber: result.card.cardNumber,
          userId,
          cardTypeId: card.cardTypeId,
        },
        '[claim] card claimed and profile initialized successfully'
      );

      void revalidateProfileTag(result.card.publicToken);

      return {
        ok: true,
        data: {
          card: {
            id: result.card.id,
            cardNumber: result.card.cardNumber,
            publicToken: result.card.publicToken,
            status: result.card.status as unknown as CardStatus,
          },
          profile: {
            id: result.profile.id,
            cardTypeId: result.profile.cardTypeId,
            status: result.profile.status,
          },
          assignment: {
            id: result.assignment.id,
          },
        },
      };
    } catch (err: any) {
      if (err.message === 'CARD_ALREADY_CLAIMED') {
        return {
          ok: false,
          status: 409,
          code: ErrorCode.CARD_ALREADY_CLAIMED,
          message: 'Card has already been claimed by another user.',
        };
      }
      if (err.message === 'CARD_NOT_FOUND') {
        return {
          ok: false,
          status: 404,
          code: ErrorCode.CARD_NOT_FOUND,
          message: 'Card not found.',
        };
      }
      logger.error({ err, cardId: card.id, userId }, '[claim] failed to claim card');
      throw err;
    }
  },
};
