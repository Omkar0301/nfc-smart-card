import crypto from 'node:crypto';
import { CardStatus } from '@prisma/client';
import { ErrorCode } from '@nfc-card/shared';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { CARD_GENERATION_QUEUE, enqueueJob } from '../lib/queue.js';
import { cardRepository, type CreateCardData } from '../repositories/card.repository.js';
import { cardTypeRepository } from '../repositories/cardType.repository.js';
import { generationJobRepository } from '../repositories/generationJob.repository.js';

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
