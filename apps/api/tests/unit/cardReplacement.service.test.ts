import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardStatus, ErrorCode } from '@nfc-card/shared';
import { cardReplacementService } from '../../src/services/cardReplacement.service.js';
import { profileRepository } from '../../src/repositories/profile.repository.js';
import { cardReplacementRepository } from '../../src/repositories/cardReplacement.repository.js';
import * as cacheInvalidation from '../../src/lib/cacheInvalidation.js';

describe('Card Replacement Service Unit Tests (F-011 / F-015)', () => {
  const dummyCard = {
    id: 'card-1',
    cardNumber: 'BC-000001',
    publicToken: 'tok-abc-123',
    cardTypeId: 'ct-business',
    status: CardStatus.ACTIVE,
  };

  const dummyAssignment = {
    id: 'assign-1',
    cardId: 'card-1',
    userId: 'user-1',
    status: 'ACTIVE',
    card: dummyCard,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cacheInvalidation, 'revalidateProfileTag').mockResolvedValue(true);
  });

  describe('reportLost', () => {
    it('returns 404 NO_ACTIVE_CARD if user has no active card', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue(null);

      const res = await cardReplacementService.reportLost('user-1', { reason: 'LOST' });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe(ErrorCode.NO_ACTIVE_CARD);
        expect(res.status).toBe(404);
      }
    });

    it('pauses active card, invalidates cache, and creates replacement request', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue(
        dummyAssignment as any
      );
      const updateCardStatusSpy = vi
        .spyOn(profileRepository, 'updateCardStatus')
        .mockResolvedValue({} as any);
      const createRequestSpy = vi
        .spyOn(cardReplacementRepository, 'createRequest')
        .mockResolvedValue({
          id: 'req-1',
          cardId: 'card-1',
          userId: 'user-1',
          reason: 'LOST',
          status: 'PENDING',
        } as any);

      const res = await cardReplacementService.reportLost('user-1', {
        reason: 'LOST',
        notes: 'Lost on train',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.card.status).toBe(CardStatus.PAUSED);
        expect(updateCardStatusSpy).toHaveBeenCalledWith('card-1', CardStatus.PAUSED);
        expect(createRequestSpy).toHaveBeenCalledWith({
          cardId: 'card-1',
          userId: 'user-1',
          reason: 'LOST',
          notes: 'Lost on train',
          status: 'PENDING',
        });
        expect(cacheInvalidation.revalidateProfileTag).toHaveBeenCalledWith('tok-abc-123');
      }
    });
  });

  describe('requestReplacement', () => {
    it('rejects with 409 REQUEST_ALREADY_PENDING if a pending request exists', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue(
        dummyAssignment as any
      );
      vi.spyOn(cardReplacementRepository, 'findPendingByCardAndUser').mockResolvedValue({
        id: 'req-pending',
      } as any);

      const res = await cardReplacementService.requestReplacement('user-1', { reason: 'DAMAGED' });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe(ErrorCode.REQUEST_ALREADY_PENDING);
        expect(res.status).toBe(409);
      }
    });

    it('creates replacement request successfully', async () => {
      vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue(
        dummyAssignment as any
      );
      vi.spyOn(cardReplacementRepository, 'findPendingByCardAndUser').mockResolvedValue(null);
      vi.spyOn(cardReplacementRepository, 'createRequest').mockResolvedValue({
        id: 'req-new',
        status: 'PENDING',
      } as any);

      const res = await cardReplacementService.requestReplacement('user-1', {
        reason: 'DAMAGED',
        notes: 'Chip scratched',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.request.id).toBe('req-new');
        expect(res.data.message).toContain('submitted');
      }
    });
  });

  describe('updateRequestStatus', () => {
    it('returns 404 if request not found', async () => {
      vi.spyOn(cardReplacementRepository, 'findById').mockResolvedValue(null);

      const res = await cardReplacementService.updateRequestStatus('non-existent', 'COMPLETED');

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('updates status and sets resolvedAt when completed', async () => {
      vi.spyOn(cardReplacementRepository, 'findById').mockResolvedValue({ id: 'req-1' } as any);
      const updateSpy = vi.spyOn(cardReplacementRepository, 'updateStatus').mockResolvedValue({
        id: 'req-1',
        status: 'COMPLETED',
      } as any);

      const res = await cardReplacementService.updateRequestStatus('req-1', 'COMPLETED');

      expect(res.ok).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith('req-1', 'COMPLETED', expect.any(Date));
    });
  });
});
