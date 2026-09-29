import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardStatus } from '@prisma/client';
import { ErrorCode, UserStatus } from '@nfc-card/shared';
import { claimService } from '../../src/services/claim.service.js';
import { cardRepository } from '../../src/repositories/card.repository.js';
import { userRepository } from '../../src/repositories/user.repository.js';

describe('Claim Service Unit Tests (F-007)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyCard = {
    id: 'card-1',
    cardNumber: 'BC-000001',
    publicToken: 'test-token-123',
    cardTypeId: 'ct-business',
    batchId: 'batch-1',
    status: CardStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
    cardType: {
      id: 'ct-business',
      name: 'Business Card',
      slug: 'business',
      cardNumberPrefix: 'BC',
      status: 'ACTIVE',
    },
  };

  const dummyUser = {
    id: 'user-1',
    name: 'John Doe',
    phone: '+15551234567',
    email: 'john@example.com',
    role: 'CUSTOMER',
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('lookupCardByToken', () => {
    it('returns 404 CARD_NOT_FOUND when card does not exist', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(null);

      const result = await claimService.lookupCardByToken('non-existent');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(404);
      expect(failure.code).toBe(ErrorCode.CARD_NOT_FOUND);
    });

    it('returns status and cardType when card is AVAILABLE', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);

      const result = await claimService.lookupCardByToken('test-token-123');
      expect(result.ok).toBe(true);
      const success = result as {
        ok: true;
        data: { status: CardStatus; cardType?: { slug: string; name: string } };
      };
      expect(success.data.status).toBe(CardStatus.AVAILABLE);
      expect(success.data.cardType?.slug).toBe('business');
      expect(success.data.cardType?.name).toBe('Business Card');
    });

    it('returns status, publicToken, and cardType when card is ACTIVE', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce({
        ...dummyCard,
        status: CardStatus.ACTIVE,
      } as any);

      const result = await claimService.lookupCardByToken('test-token-123');
      expect(result.ok).toBe(true);
      const success = result as {
        ok: true;
        data: {
          status: CardStatus;
          publicToken?: string;
          cardType?: { slug: string; name: string };
        };
      };
      expect(success.data.status).toBe(CardStatus.ACTIVE);
      expect(success.data.publicToken).toBe('test-token-123');
      expect(success.data.cardType?.slug).toBe('business');
    });

    it('returns status only when card is PAUSED / SUSPENDED / DEACTIVATED', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce({
        ...dummyCard,
        status: CardStatus.PAUSED,
      } as any);

      const result = await claimService.lookupCardByToken('test-token-123');
      expect(result.ok).toBe(true);
      const success = result as { ok: true; data: { status: CardStatus } };
      expect(success.data.status).toBe(CardStatus.PAUSED);
    });
  });

  describe('claimCard', () => {
    it('returns 404 CARD_NOT_FOUND if card does not exist', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(null);

      const result = await claimService.claimCard('unknown-token', 'user-1');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(404);
      expect(failure.code).toBe(ErrorCode.CARD_NOT_FOUND);
    });

    it('returns 409 CARD_NOT_AVAILABLE if card is not AVAILABLE', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce({
        ...dummyCard,
        status: CardStatus.ACTIVE,
      } as any);

      const result = await claimService.claimCard('test-token-123', 'user-1');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(409);
      expect(failure.code).toBe(ErrorCode.CARD_NOT_AVAILABLE);
    });

    it('returns 404 USER_NOT_FOUND if user does not exist', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);
      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce(null);

      const result = await claimService.claimCard('test-token-123', 'missing-user');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(404);
      expect(failure.code).toBe(ErrorCode.USER_NOT_FOUND);
    });

    it('returns 403 ACCOUNT_SUSPENDED if user is suspended', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);
      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce({
        ...dummyUser,
        status: UserStatus.SUSPENDED,
      } as any);

      const result = await claimService.claimCard('test-token-123', 'user-1');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(403);
      expect(failure.code).toBe(ErrorCode.ACCOUNT_SUSPENDED);
    });

    it('returns 409 USER_ALREADY_HAS_CARD if user already has active card of same type', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);
      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce(dummyUser as any);
      vi.spyOn(cardRepository, 'findActiveAssignmentByUserIdAndCardTypeId').mockResolvedValueOnce({
        id: 'assignment-existing',
        cardId: 'card-existing',
        userId: 'user-1',
        status: 'ACTIVE',
        assignedAt: new Date(),
        unassignedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        card: dummyCard as any,
      });

      const result = await claimService.claimCard('test-token-123', 'user-1');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(409);
      expect(failure.code).toBe(ErrorCode.USER_ALREADY_HAS_CARD);
    });

    it('returns 409 CARD_ALREADY_CLAIMED when race condition occurs inside transaction', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);
      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce(dummyUser as any);
      vi.spyOn(cardRepository, 'findActiveAssignmentByUserIdAndCardTypeId').mockResolvedValueOnce(
        null
      );
      vi.spyOn(cardRepository, 'claimCardTransaction').mockRejectedValueOnce(
        new Error('CARD_ALREADY_CLAIMED')
      );

      const result = await claimService.claimCard('test-token-123', 'user-1');
      expect(result.ok).toBe(false);
      const failure = result as { ok: false; status: number; code: ErrorCode };
      expect(failure.status).toBe(409);
      expect(failure.code).toBe(ErrorCode.CARD_ALREADY_CLAIMED);
    });

    it('succeeds and creates card assignment & draft profile', async () => {
      vi.spyOn(cardRepository, 'findByPublicToken').mockResolvedValueOnce(dummyCard as any);
      vi.spyOn(userRepository, 'findById').mockResolvedValueOnce(dummyUser as any);
      vi.spyOn(cardRepository, 'findActiveAssignmentByUserIdAndCardTypeId').mockResolvedValueOnce(
        null
      );

      vi.spyOn(cardRepository, 'claimCardTransaction').mockResolvedValueOnce({
        card: {
          ...dummyCard,
          status: CardStatus.ASSIGNED,
        } as any,
        assignment: {
          id: 'assign-new',
          cardId: dummyCard.id,
          userId: dummyUser.id,
          status: 'ACTIVE',
          assignedAt: new Date(),
        } as any,
        profile: {
          id: 'profile-new',
          userId: dummyUser.id,
          cardTypeId: dummyCard.cardTypeId,
          data: {},
          fieldVisibility: {},
          status: 'draft',
        } as any,
      });

      const result = await claimService.claimCard('test-token-123', 'user-1');
      expect(result.ok).toBe(true);
      const success = result as {
        ok: true;
        data: {
          card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
          profile: { id: string; cardTypeId: string; status: string };
          assignment: { id: string };
        };
      };
      expect(success.data.card.status).toBe(CardStatus.ASSIGNED);
      expect(success.data.profile.status).toBe('draft');
      expect(success.data.assignment.id).toBe('assign-new');
    });
  });
});
