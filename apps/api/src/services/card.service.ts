import crypto from 'node:crypto';
import { CardStatus } from '@prisma/client';
import { ErrorCode } from '@nfc-card/shared';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { CARD_GENERATION_QUEUE, enqueueJob } from '../lib/queue.js';
import { cardRepository, type CreateCardData } from '../repositories/card.repository.js';
import { cardTypeRepository } from '../repositories/cardType.repository.js';
import { generationJobRepository } from '../repositories/generationJob.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { revalidateProfileTag } from '../lib/cacheInvalidation.js';
import type { ListCardsQuery } from '../validators/card.validator.js';

export interface GenerateCardsInput {
  cardTypeId: string;
  quantity: number;
  requestedBy: string;
}

export interface CardGenerationJobPayload {
  jobId: string;
  batchId: string;
  cardTypeId: string;
  quantity: number;
  requestedBy: string;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

function escapeCsvField(val: string | null | undefined): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const cardService = {
  generatePublicToken(): string {
    return crypto.randomBytes(16).toString('base64url');
  },

  async generateCards(input: GenerateCardsInput): Promise<
    ServiceResult<{
      jobId: string;
      batchId: string;
      message: string;
    }>
  > {
    if (!input.quantity || input.quantity < 1 || input.quantity > 10000) {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.INVALID_QUANTITY,
        message: 'Quantity must be between 1 and 10,000.',
      };
    }

    const cardType = await cardTypeRepository.findById(input.cardTypeId);
    if (!cardType) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_TYPE_NOT_FOUND,
        message: 'Card type not found.',
      };
    }

    if (cardType.status !== 'ACTIVE') {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.CARD_TYPE_INACTIVE,
        message: 'Cannot generate cards for an inactive card type.',
      };
    }

    const batchId = crypto.randomUUID();

    const job = await generationJobRepository.create({
      batchId,
      cardTypeId: input.cardTypeId,
      requestedBy: input.requestedBy,
      quantity: input.quantity,
      status: 'PENDING',
    });

    const payload: CardGenerationJobPayload = {
      jobId: job.id,
      batchId,
      cardTypeId: input.cardTypeId,
      quantity: input.quantity,
      requestedBy: input.requestedBy,
    };

    const enqueuedId = await enqueueJob(CARD_GENERATION_QUEUE, payload);
    if (!enqueuedId) {
      logger.warn(
        { jobId: job.id, batchId },
        '[cardService] pg-boss not active; job record created in PENDING state'
      );
    }

    return {
      ok: true,
      data: {
        jobId: job.id,
        batchId,
        message: 'Generation job enqueued',
      },
    };
  },

  async getJobStatus(jobId: string): Promise<ServiceResult<{ job: unknown }>> {
    const job = await generationJobRepository.findById(jobId);
    if (!job) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.JOB_NOT_FOUND,
        message: 'Job not found.',
      };
    }

    return {
      ok: true,
      data: {
        job: {
          id: job.id,
          batchId: job.batchId,
          cardTypeId: job.cardTypeId,
          cardType: job.cardType,
          quantity: job.quantity,
          generated: job.generated,
          status: job.status,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      },
    };
  },

  async listRecentJobs(limit = 20) {
    const jobs = await generationJobRepository.listRecentJobs(limit);
    return {
      ok: true as const,
      data: { jobs },
    };
  },

  async invalidateDefectiveBatch(batchId: string): Promise<
    ServiceResult<{
      invalidated: number;
      skipped: number;
      message: string;
    }>
  > {
    const totalInBatch = await cardRepository.countByBatchId(batchId);
    if (totalInBatch === 0) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.BATCH_NOT_FOUND,
        message: 'Batch not found.',
      };
    }

    const skipped = await cardRepository.countSkippedByBatchId(batchId);
    const updateResult = await cardRepository.invalidateDefectiveBatch(batchId);

    return {
      ok: true,
      data: {
        invalidated: updateResult.count,
        skipped,
        message: `${skipped} cards in assigned/active/paused state were skipped`,
      },
    };
  },

  async exportCardsCsv(filters: {
    cardTypeId?: string;
    status?: CardStatus;
    batchId?: string;
  }): Promise<string> {
    const cards = await cardRepository.findCardsForExport(filters);
    const primaryWebUrl = config.WEB_URL.split(',')[0].trim().replace(/\/+$/, '');

    const header = 'Card Number,Card Type,NFC URL,Status\n';
    const rows = cards.map((c) => {
      const nfcUrl = `${primaryWebUrl}/p/${c.cardType.slug}/${c.publicToken}`;
      return [
        escapeCsvField(c.cardNumber),
        escapeCsvField(c.cardType.name),
        escapeCsvField(nfcUrl),
        escapeCsvField(c.status),
      ].join(',');
    });

    return header + rows.join('\n');
  },

  async listCards(filters: ListCardsQuery): Promise<
    ServiceResult<{
      cards: any[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    const result = await cardRepository.findCards(filters);
    const primaryWebUrl = config.WEB_URL.split(',')[0].trim().replace(/\/+$/, '');

    const formattedCards = result.cards.map((card) => {
      const activeAssignment = card.assignments[0] || null;
      const nfcUrl = `${primaryWebUrl}/p/${card.cardType.slug}/${card.publicToken}`;
      return {
        id: card.id,
        cardNumber: card.cardNumber,
        publicToken: card.publicToken,
        nfcUrl,
        batchId: card.batchId,
        status: card.status,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        cardType: card.cardType,
        assignments: card.assignments,
        activeAssignment,
      };
    });

    return {
      ok: true,
      data: {
        cards: formattedCards,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  },

  async getCardById(id: string): Promise<ServiceResult<{ card: any }>> {
    const card = await cardRepository.findCardDetailById(id);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    const primaryWebUrl = config.WEB_URL.split(',')[0].trim().replace(/\/+$/, '');
    const nfcUrl = `${primaryWebUrl}/p/${card.cardType.slug}/${card.publicToken}`;

    return {
      ok: true,
      data: {
        card: {
          ...card,
          nfcUrl,
        },
      },
    };
  },

  async assignCard(
    cardId: string,
    userId: string
  ): Promise<ServiceResult<{ card: any; assignment: any; message: string }>> {
    const card = await cardRepository.findById(cardId);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'Card has been permanently deactivated.',
      };
    }

    if (card.status !== CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: `Cannot manually assign card with status '${card.status}'. Only AVAILABLE cards can be assigned.`,
        details: { from: card.status, to: CardStatus.ASSIGNED },
      };
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.USER_NOT_FOUND,
        message: 'Target user not found.',
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.ACCOUNT_SUSPENDED,
        message: 'Cannot assign card to an inactive or suspended user account.',
      };
    }

    const existingAssignment = await cardRepository.findActiveAssignmentByUserIdAndCardTypeId(
      userId,
      card.cardTypeId
    );
    if (existingAssignment) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.USER_ALREADY_HAS_CARD,
        message: 'User already has an active card of this card type.',
      };
    }

    const result = await cardRepository.assignCardTransaction(cardId, userId);
    logger.info(
      { cardId, userId, cardNumber: card.cardNumber },
      '[cardLifecycle] card manually assigned to user'
    );

    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        card: result.card,
        assignment: result.assignment,
        message: `Card ${card.cardNumber} successfully assigned to ${user.name || user.phone}.`,
      },
    };
  },

  async activateCard(cardId: string): Promise<ServiceResult<{ card: any; message: string }>> {
    const card = await cardRepository.findById(cardId);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status === CardStatus.ACTIVE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: 'Card is already active.',
      };
    }

    if (card.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'Card has been permanently deactivated.',
      };
    }

    if (card.status !== CardStatus.ASSIGNED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: `Cannot manually activate card with status '${card.status}'. Only ASSIGNED cards can be activated.`,
        details: { from: card.status, to: CardStatus.ACTIVE },
      };
    }

    const updated = await cardRepository.updateStatus(cardId, CardStatus.ACTIVE);
    logger.info(
      { cardId, cardNumber: card.cardNumber },
      '[cardLifecycle] card manually activated by admin'
    );

    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        card: updated,
        message: `Card ${card.cardNumber} activated successfully.`,
      },
    };
  },

  async suspendCard(
    cardId: string,
    reason?: string
  ): Promise<ServiceResult<{ card: any; reason?: string; message: string }>> {
    const card = await cardRepository.findById(cardId);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'Cannot suspend a permanently deactivated card.',
      };
    }

    if (card.status === CardStatus.SUSPENDED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: 'Card is already suspended.',
      };
    }

    if (card.status === CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: 'Cannot suspend an unassigned available card.',
      };
    }

    const updated = await cardRepository.updateStatus(cardId, CardStatus.SUSPENDED);
    logger.info(
      { cardId, cardNumber: card.cardNumber, reason },
      '[cardLifecycle] card suspended by admin'
    );

    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        card: updated,
        reason,
        message: `Card ${card.cardNumber} suspended successfully.`,
      },
    };
  },

  async unsuspendCard(cardId: string): Promise<ServiceResult<{ card: any; message: string }>> {
    const card = await cardRepository.findById(cardId);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status !== CardStatus.SUSPENDED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: `Only SUSPENDED cards can be unsuspended. Current status is '${card.status}'.`,
        details: { from: card.status, to: CardStatus.ACTIVE },
      };
    }

    const updated = await cardRepository.updateStatus(cardId, CardStatus.ACTIVE);
    logger.info(
      { cardId, cardNumber: card.cardNumber },
      '[cardLifecycle] card unsuspended by admin'
    );

    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        card: updated,
        message: `Card ${card.cardNumber} unsuspended and reinstated to ACTIVE.`,
      },
    };
  },

  async deactivateCard(
    cardId: string,
    reason?: string
  ): Promise<ServiceResult<{ card: any; reason?: string; message: string }>> {
    const card = await cardRepository.findById(cardId);
    if (!card) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Card not found.',
      };
    }

    if (card.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'Card has already been permanently deactivated.',
      };
    }

    const updated = await cardRepository.deactivateCardTransaction(cardId);
    logger.info(
      { cardId, cardNumber: card.cardNumber, reason },
      '[cardLifecycle] card permanently deactivated by admin'
    );

    void revalidateProfileTag(card.publicToken);

    return {
      ok: true,
      data: {
        card: updated,
        reason,
        message: `Card ${card.cardNumber} permanently deactivated.`,
      },
    };
  },

  async replaceCard(
    cardId: string,
    replacementCardId: string
  ): Promise<
    ServiceResult<{
      oldCard: any;
      newCard: any;
      assignment: any;
      message: string;
    }>
  > {
    const oldCard = await cardRepository.findById(cardId);
    if (!oldCard) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Original card not found.',
      };
    }

    if (oldCard.status === CardStatus.DEACTIVATED) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_DEACTIVATED_PERMANENT,
        message: 'Cannot replace a permanently deactivated card.',
      };
    }

    if (oldCard.status === CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.INVALID_TRANSITION,
        message: 'Cannot replace an unassigned available card.',
      };
    }

    const activeAssignment = await cardRepository.findActiveAssignmentByCardId(cardId);
    if (!activeAssignment) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.ACTIVE_ASSIGNMENT_NOT_FOUND,
        message: 'No active user assignment found on the original card to carry over.',
      };
    }

    const replacementCard = await cardRepository.findById(replacementCardId);
    if (!replacementCard) {
      return {
        ok: false,
        status: 404,
        code: ErrorCode.CARD_NOT_FOUND,
        message: 'Replacement card not found.',
      };
    }

    if (replacementCard.status !== CardStatus.AVAILABLE) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.REPLACEMENT_NOT_AVAILABLE,
        message: `Replacement card is not in AVAILABLE status (currently '${replacementCard.status}').`,
      };
    }

    if (replacementCard.cardTypeId !== oldCard.cardTypeId) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.CARD_TYPE_MISMATCH,
        message: 'Replacement card must be of the exact same card type as the original card.',
      };
    }

    // Determine replacement status:
    // If old card was ACTIVE or PAUSED, new card immediately becomes ACTIVE (profile is already published).
    // If old card was ASSIGNED or SUSPENDED, new card becomes ASSIGNED.
    const newCardStatus =
      oldCard.status === CardStatus.ACTIVE || oldCard.status === CardStatus.PAUSED
        ? CardStatus.ACTIVE
        : CardStatus.ASSIGNED;

    const result = await cardRepository.replaceCardTransaction({
      oldCardId: cardId,
      replacementCardId,
      userId: activeAssignment.userId,
      newCardStatus,
    });

    logger.info(
      {
        oldCardId: cardId,
        oldCardNumber: oldCard.cardNumber,
        replacementCardId,
        replacementCardNumber: replacementCard.cardNumber,
        userId: activeAssignment.userId,
      },
      '[cardLifecycle] card replaced successfully'
    );

    void revalidateProfileTag(oldCard.publicToken);
    void revalidateProfileTag(replacementCard.publicToken);

    return {
      ok: true,
      data: {
        oldCard: result.oldCard,
        newCard: result.newCard,
        assignment: result.assignment,
        message: `Card ${oldCard.cardNumber} replaced with ${replacementCard.cardNumber}. Profile and user data carried over.`,
      },
    };
  },

  async getAvailableReplacementCards(
    cardTypeId: string,
    excludeCardId: string,
    search?: string,
    limit?: number
  ): Promise<ServiceResult<{ cards: any[] }>> {
    const cards = await cardRepository.findAvailableReplacementCards(
      cardTypeId,
      excludeCardId,
      search,
      limit
    );
    return {
      ok: true,
      data: { cards },
    };
  },

  async searchUsers(query: string, limit?: number): Promise<ServiceResult<{ users: any[] }>> {
    const users = await userRepository.searchUsers(query, limit);
    return {
      ok: true,
      data: { users },
    };
  },

  async processCardGenerationJob(payload: CardGenerationJobPayload): Promise<void> {
    const { jobId, batchId, cardTypeId, quantity } = payload;
    logger.info(
      { jobId, batchId, cardTypeId, quantity },
      '[cardGeneration] starting job execution'
    );

    const job = await generationJobRepository.findById(jobId);
    if (!job) {
      logger.error({ jobId }, '[cardGeneration] job record not found in database');
      return;
    }

    await generationJobRepository.updateStatus(jobId, 'RUNNING', {
      startedAt: new Date(),
    });

    const cardType = await cardTypeRepository.findById(cardTypeId);
    if (!cardType) {
      const errMsg = `Card type '${cardTypeId}' not found`;
      logger.error({ jobId, cardTypeId }, errMsg);
      await generationJobRepository.updateStatus(jobId, 'FAILED', {
        completedAt: new Date(),
        errorMessage: errMsg,
      });
      return;
    }

    const prefix = cardType.cardNumberPrefix || 'BC';
    const alreadyGenerated = await cardRepository.countByBatchId(batchId);
    let remainingToGenerate = quantity - alreadyGenerated;

    if (remainingToGenerate <= 0) {
      logger.info(
        { jobId, batchId },
        '[cardGeneration] batch already completed (idempotency check)'
      );
      await generationJobRepository.updateStatus(jobId, 'COMPLETED', {
        completedAt: new Date(),
        generated: quantity,
      });
      return;
    }

    // Determine highest sequence
    const highestCard = await cardRepository.findHighestCardNumber(cardTypeId, prefix);
    let currentSequence = 0;
    if (highestCard?.cardNumber) {
      const match = highestCard.cardNumber.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match && match[1]) {
        currentSequence = parseInt(match[1], 10);
      }
    }

    let totalGenerated = alreadyGenerated;
    const CHUNK_SIZE = 50;

    try {
      while (remainingToGenerate > 0) {
        const chunkSize = Math.min(CHUNK_SIZE, remainingToGenerate);
        const chunkCards: CreateCardData[] = [];

        for (let i = 0; i < chunkSize; i++) {
          currentSequence++;
          const seqString = String(currentSequence).padStart(6, '0');
          const cardNumber = `${prefix}-${seqString}`;
          const publicToken = this.generatePublicToken();

          chunkCards.push({
            cardNumber,
            publicToken,
            cardTypeId,
            batchId,
            status: CardStatus.AVAILABLE,
          });
        }

        try {
          await cardRepository.createManyCards(chunkCards);
          totalGenerated += chunkCards.length;
          remainingToGenerate -= chunkCards.length;
          await generationJobRepository.updateProgress(jobId, totalGenerated);
        } catch (chunkErr) {
          logger.warn(
            { chunkErr },
            '[cardGeneration] batch create failed, falling back to per-card retry'
          );
          // Fallback to inserting one by one with collision retries
          for (const cardData of chunkCards) {
            let inserted = false;
            let token = cardData.publicToken;

            for (let retry = 0; retry < 5; retry++) {
              try {
                await cardRepository.createCard({
                  ...cardData,
                  publicToken: token,
                });
                inserted = true;
                totalGenerated++;
                remainingToGenerate--;
                await generationJobRepository.updateProgress(jobId, totalGenerated);
                break;
              } catch (singleErr: any) {
                if (singleErr?.code === 'P2002') {
                  // Collision on unique constraint; regenerate token and retry
                  logger.warn(
                    { retry, cardNumber: cardData.cardNumber },
                    '[cardGeneration] token collision detected, regenerating token'
                  );
                  token = this.generatePublicToken();
                } else {
                  throw singleErr;
                }
              }
            }

            if (!inserted) {
              logger.error(
                { cardNumber: cardData.cardNumber },
                '[cardGeneration] card failed after 5 token retries; skipping card'
              );
              remainingToGenerate--;
            }
          }
        }
      }

      await generationJobRepository.updateStatus(jobId, 'COMPLETED', {
        completedAt: new Date(),
        generated: totalGenerated,
      });

      logger.info({ jobId, totalGenerated }, '[cardGeneration] job completed successfully');
    } catch (err: any) {
      logger.error({ err, jobId }, '[cardGeneration] unrecoverable error during card generation');
      const finalStatus = totalGenerated > 0 ? 'PARTIAL' : 'FAILED';
      await generationJobRepository.updateStatus(jobId, finalStatus, {
        completedAt: new Date(),
        errorMessage: err?.message || 'Unknown error during card generation',
        generated: totalGenerated,
      });
    }
  },
};
