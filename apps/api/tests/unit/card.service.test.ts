import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cardService } from '../../src/services/card.service.js';
import { cardTypeRepository } from '../../src/repositories/cardType.repository.js';
import { generationJobRepository } from '../../src/repositories/generationJob.repository.js';
import { cardRepository } from '../../src/repositories/card.repository.js';
import * as queueModule from '../../src/lib/queue.js';
import * as cacheInvalidation from '../../src/lib/cacheInvalidation.js';
import { ErrorCode, CardStatus } from '@nfc-card/shared';

describe('Card Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyCardType = {
    id: 'ct-1',
    name: 'Business Card',
    slug: 'business',
    cardNumberPrefix: 'BC',
    description: 'Test',
    fieldSchema: [],
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyJob = {
    id: 'job-123',
    batchId: 'batch-abc',
    cardTypeId: 'ct-1',
    requestedBy: 'user-admin',
    quantity: 100,
    generated: 0,
    status: 'PENDING',
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('generateCards fails when quantity is invalid', async () => {
    const result = await cardService.generateCards({
      cardTypeId: 'ct-1',
      quantity: 0,
      requestedBy: 'admin',
    });
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.code).toBe(ErrorCode.INVALID_QUANTITY);
    expect(failure.status).toBe(400);
  });

  it('generateCards fails when cardType not found', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(null);

    const result = await cardService.generateCards({
      cardTypeId: 'ct-none',
      quantity: 10,
      requestedBy: 'admin',
    });
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.code).toBe(ErrorCode.CARD_TYPE_NOT_FOUND);
    expect(failure.status).toBe(404);
  });

  it('generateCards fails when cardType is inactive', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce({
      ...dummyCardType,
      status: 'INACTIVE',
    } as any);

    const result = await cardService.generateCards({
      cardTypeId: 'ct-1',
      quantity: 10,
      requestedBy: 'admin',
    });
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.code).toBe(ErrorCode.CARD_TYPE_INACTIVE);
    expect(failure.status).toBe(400);
  });

  it('generateCards succeeds and enqueues background job', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(generationJobRepository, 'create').mockResolvedValueOnce(dummyJob as any);
    vi.spyOn(queueModule, 'enqueueJob').mockResolvedValueOnce('queue-job-id-1');

    const result = await cardService.generateCards({
      cardTypeId: 'ct-1',
      quantity: 100,
      requestedBy: 'admin',
    });

    expect(result.ok).toBe(true);
    const success = result as {
      ok: true;
      data: { jobId: string; batchId: string; message: string };
    };
    expect(success.data.jobId).toBe('job-123');
    expect(success.data.batchId).toBeDefined();
    expect(success.data.message).toBe('Generation job enqueued');
  });

  it('getJobStatus returns 404 when job does not exist', async () => {
    vi.spyOn(generationJobRepository, 'findById').mockResolvedValueOnce(null);

    const result = await cardService.getJobStatus('unknown-job');
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.code).toBe(ErrorCode.JOB_NOT_FOUND);
    expect(failure.status).toBe(404);
  });

  it('getJobStatus returns job when found', async () => {
    vi.spyOn(generationJobRepository, 'findById').mockResolvedValueOnce(dummyJob as any);

    const result = await cardService.getJobStatus('job-123');
    expect(result.ok).toBe(true);
    const success = result as { ok: true; data: { job: any } };
    expect(success.data.job.id).toBe('job-123');
    expect(success.data.job.status).toBe('PENDING');
  });

  it('invalidateDefectiveBatch returns 404 when batch not found', async () => {
    vi.spyOn(cardRepository, 'countByBatchId').mockResolvedValueOnce(0);

    const result = await cardService.invalidateDefectiveBatch('unknown-batch');
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.code).toBe(ErrorCode.BATCH_NOT_FOUND);
    expect(failure.status).toBe(404);
  });

  it('invalidateDefectiveBatch deactivates available cards and reports skipped count', async () => {
    vi.spyOn(cardRepository, 'countByBatchId').mockResolvedValueOnce(10);
    vi.spyOn(cardRepository, 'countSkippedByBatchId').mockResolvedValueOnce(3);
    vi.spyOn(cardRepository, 'invalidateDefectiveBatch').mockResolvedValueOnce({ count: 7 });

    const result = await cardService.invalidateDefectiveBatch('batch-123');
    expect(result.ok).toBe(true);
    const success = result as {
      ok: true;
      data: { invalidated: number; skipped: number; message: string };
    };
    expect(success.data.invalidated).toBe(7);
    expect(success.data.skipped).toBe(3);
    expect(success.data.message).toContain('3 cards in assigned/active/paused state were skipped');
  });

  it('processCardGenerationJob generates cards sequentially and marks COMPLETED', async () => {
    vi.spyOn(generationJobRepository, 'findById').mockResolvedValueOnce(dummyJob as any);
    vi.spyOn(generationJobRepository, 'updateStatus').mockResolvedValue({} as any);
    vi.spyOn(generationJobRepository, 'updateProgress').mockResolvedValue({} as any);
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(cardRepository, 'countByBatchId').mockResolvedValueOnce(0);
    vi.spyOn(cardRepository, 'findHighestCardNumber').mockResolvedValueOnce({
      cardNumber: 'BC-000010',
    } as any);
    const createManySpy = vi
      .spyOn(cardRepository, 'createManyCards')
      .mockResolvedValue({ count: 5 } as any);

    await cardService.processCardGenerationJob({
      jobId: 'job-123',
      batchId: 'batch-abc',
      cardTypeId: 'ct-1',
      quantity: 5,
      requestedBy: 'admin',
    });

    expect(createManySpy).toHaveBeenCalledTimes(1);
    const createdArgs = createManySpy.mock.calls[0][0];
    expect(createdArgs).toHaveLength(5);
    expect(createdArgs[0].cardNumber).toBe('BC-000011');
    expect(createdArgs[4].cardNumber).toBe('BC-000015');
    expect(createdArgs[0].publicToken).toBeDefined();
  });

  describe('Lifecycle cache invalidation', () => {
    it('triggers revalidateProfileTag when suspending a card', async () => {
      const revalidateSpy = vi.spyOn(cacheInvalidation, 'revalidateProfileTag').mockResolvedValue();
      vi.spyOn(cardRepository, 'findById').mockResolvedValueOnce({
        id: 'c-1',
        cardNumber: 'BC-000001',
        publicToken: 'tok-reval',
        status: CardStatus.ACTIVE,
      } as any);
      vi.spyOn(cardRepository, 'updateStatus').mockResolvedValueOnce({
        id: 'c-1',
        status: CardStatus.SUSPENDED,
      } as any);

      const result = await cardService.suspendCard('c-1', 'Violation');
      expect(result.ok).toBe(true);
      expect(revalidateSpy).toHaveBeenCalledWith('tok-reval');
    });

    it('triggers revalidateProfileTag when activating a card', async () => {
      const revalidateSpy = vi.spyOn(cacheInvalidation, 'revalidateProfileTag').mockResolvedValue();
      vi.spyOn(cardRepository, 'findById').mockResolvedValueOnce({
        id: 'c-1',
        cardNumber: 'BC-000001',
        publicToken: 'tok-reval',
        status: CardStatus.ASSIGNED,
      } as any);
      vi.spyOn(cardRepository, 'updateStatus').mockResolvedValueOnce({
        id: 'c-1',
        status: CardStatus.ACTIVE,
      } as any);

      const result = await cardService.activateCard('c-1');
      expect(result.ok).toBe(true);
      expect(revalidateSpy).toHaveBeenCalledWith('tok-reval');
    });
  });
});
