import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cardTypeService } from '../../src/services/cardType.service.js';
import { cardTypeRepository } from '../../src/repositories/cardType.repository.js';
import { ErrorCode } from '@nfc-card/shared';

describe('CardType Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyCardType = {
    id: 'ct-123',
    name: 'Business Card',
    slug: 'business',
    description: 'Business card description',
    fieldSchema: [
      { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
    ],
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('listCardTypes returns list of card types', async () => {
    vi.spyOn(cardTypeRepository, 'findAll').mockResolvedValueOnce([dummyCardType as any]);

    const result = await cardTypeService.listCardTypes();
    expect(result.ok).toBe(true);
    const data = (result as { ok: true; data: { cardTypes: any[] } }).data;
    expect(data.cardTypes).toHaveLength(1);
    expect(data.cardTypes[0].slug).toBe('business');
  });

  it('getCardTypeById returns 404 when card type does not exist', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(null);

    const result = await cardTypeService.getCardTypeById('non-existent');
    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(404);
    expect(failure.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('createCardType returns 409 when slug already exists', async () => {
    vi.spyOn(cardTypeRepository, 'findBySlug').mockResolvedValueOnce(dummyCardType as any);

    const result = await cardTypeService.createCardType({
      name: 'Business Duplicate',
      slug: 'business',
      fieldSchema: [
        { key: 'name', label: 'Name', type: 'text', required: true, defaultVisible: true },
      ],
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(409);
    expect(failure.code).toBe(ErrorCode.SLUG_EXISTS);
  });

  it('createCardType returns 400 when duplicate keys exist in fieldSchema', async () => {
    vi.spyOn(cardTypeRepository, 'findBySlug').mockResolvedValueOnce(null);

    const result = await cardTypeService.createCardType({
      name: 'Test Card',
      slug: 'test-card',
      fieldSchema: [
        { key: 'email', label: 'Email', type: 'email', required: false, defaultVisible: true },
        { key: 'email', label: 'Email 2', type: 'email', required: false, defaultVisible: true },
      ],
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(400);
    expect(failure.code).toBe(ErrorCode.DUPLICATE_FIELD_KEY);
  });

  it('updateCardType returns 404 when target does not exist', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(null);

    const result = await cardTypeService.updateCardType('ct-unknown', {
      name: 'New Name',
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(404);
    expect(failure.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('updateCardType warns when deactivating a type with existing cards', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(cardTypeRepository, 'countCardsByCardTypeId').mockResolvedValueOnce(5);
    vi.spyOn(cardTypeRepository, 'update').mockResolvedValueOnce({
      ...dummyCardType,
      status: 'INACTIVE',
    } as any);

    const result = await cardTypeService.updateCardType('ct-123', {
      status: 'INACTIVE',
    });

    expect(result.ok).toBe(true);
    const data = (result as { ok: true; data: { warning?: string; cardType: any } }).data;
    expect(data.warning).toBe('5 active cards exist for this type');
    expect(data.cardType.status).toBe('INACTIVE');
  });
});
