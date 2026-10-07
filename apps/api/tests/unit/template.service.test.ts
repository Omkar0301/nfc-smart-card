import { describe, it, expect, vi, beforeEach } from 'vitest';
import { templateService } from '../../src/services/template.service.js';
import { templateRepository } from '../../src/repositories/template.repository.js';
import { cardTypeRepository } from '../../src/repositories/cardType.repository.js';
import { ErrorCode } from '@nfc-card/shared';

describe('Template Service Unit Tests (F-009)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyCardType = {
    id: 'ct-business',
    name: 'Business Card',
    slug: 'business',
    cardNumberPrefix: 'BC',
    fieldSchema: [],
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyTemplate = {
    id: 'tpl-1',
    cardTypeId: 'ct-business',
    name: 'Modern',
    slug: 'business-modern',
    thumbnail: null,
    isActive: true,
    isPremium: false,
    sortOrder: 1,
    configuration: { description: 'Clean layout' },
    createdAt: new Date(),
    updatedAt: new Date(),
    cardType: { slug: 'business', name: 'Business Card' },
  };

  it('listTemplatesForCardType returns 404 when the card type does not exist', async () => {
    vi.spyOn(cardTypeRepository, 'findBySlug').mockResolvedValueOnce(null);

    const result = await templateService.listTemplatesForCardType('doctor');

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(404);
    expect(failure.code).toBe(ErrorCode.CARD_TYPE_NOT_FOUND);
  });

  it('listTemplatesForCardType maps rows to summaries with cardTypeSlug', async () => {
    vi.spyOn(cardTypeRepository, 'findBySlug').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(templateRepository, 'findActiveByCardTypeSlug').mockResolvedValueOnce([
      dummyTemplate as any,
    ]);

    const result = await templateService.listTemplatesForCardType('business');

    expect(result.ok).toBe(true);
    const data = (result as { ok: true; data: { templates: any[] } }).data;
    expect(data.templates).toHaveLength(1);
    expect(data.templates[0].slug).toBe('business-modern');
    expect(data.templates[0].cardTypeSlug).toBe('business');
    expect(data.templates[0].configuration).toEqual({ description: 'Clean layout' });
  });

  it('createTemplate returns 404 when the card type does not exist', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(null);

    const result = await templateService.createTemplate({
      cardTypeId: 'missing',
      name: 'Modern',
      slug: 'business-modern',
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(404);
    expect(failure.code).toBe(ErrorCode.CARD_TYPE_NOT_FOUND);
  });

  it('createTemplate returns 409 when the slug already exists for that card type', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(templateRepository, 'findByCardTypeIdAndSlug').mockResolvedValueOnce(
      dummyTemplate as any
    );

    const result = await templateService.createTemplate({
      cardTypeId: 'ct-business',
      name: 'Modern Duplicate',
      slug: 'business-modern',
    });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(409);
    expect(failure.code).toBe(ErrorCode.TEMPLATE_SLUG_EXISTS);
  });

  it('createTemplate defaults sortOrder to count + 1 and normalizes name/slug', async () => {
    vi.spyOn(cardTypeRepository, 'findById').mockResolvedValueOnce(dummyCardType as any);
    vi.spyOn(templateRepository, 'findByCardTypeIdAndSlug').mockResolvedValueOnce(null);
    vi.spyOn(templateRepository, 'countByCardTypeId').mockResolvedValueOnce(2);
    const createSpy = vi
      .spyOn(templateRepository, 'create')
      .mockResolvedValueOnce({ ...dummyTemplate, sortOrder: 3 } as any);

    const result = await templateService.createTemplate({
      cardTypeId: 'ct-business',
      name: '  Premium  ',
      slug: 'business-premium',
    });

    expect(result.ok).toBe(true);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cardTypeId: 'ct-business',
        name: 'Premium',
        slug: 'business-premium',
        sortOrder: 3,
        isActive: true,
        isPremium: false,
      })
    );
  });

  it('updateTemplate returns 404 when the template does not exist', async () => {
    vi.spyOn(templateRepository, 'findById').mockResolvedValueOnce(null);

    const result = await templateService.updateTemplate('tpl-missing', { isActive: false });

    expect(result.ok).toBe(false);
    const failure = result as { ok: false; status: number; code: ErrorCode };
    expect(failure.status).toBe(404);
    expect(failure.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
  });

  it('updateTemplate forwards only the provided fields', async () => {
    vi.spyOn(templateRepository, 'findById').mockResolvedValueOnce(dummyTemplate as any);
    const updateSpy = vi
      .spyOn(templateRepository, 'update')
      .mockResolvedValueOnce({ ...dummyTemplate, isPremium: true, sortOrder: 4 } as any);

    const result = await templateService.updateTemplate('tpl-1', { isPremium: true, sortOrder: 4 });

    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith('tpl-1', { isPremium: true, sortOrder: 4 });
    const data = (result as { ok: true; data: { template: any } }).data;
    expect(data.template.isPremium).toBe(true);
    expect(data.template.sortOrder).toBe(4);
  });

  it('deleteTemplate hard-deletes when no profiles reference it', async () => {
    vi.spyOn(templateRepository, 'findById').mockResolvedValueOnce(dummyTemplate as any);
    vi.spyOn(templateRepository, 'countProfilesByTemplateId').mockResolvedValueOnce(0);
    const deleteSpy = vi
      .spyOn(templateRepository, 'delete')
      .mockResolvedValueOnce(dummyTemplate as any);
    const updateSpy = vi.spyOn(templateRepository, 'update');

    const result = await templateService.deleteTemplate('tpl-1');

    expect(result.ok).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith('tpl-1');
    expect(updateSpy).not.toHaveBeenCalled();
    const data = (result as { ok: true; data: { deactivated: boolean } }).data;
    expect(data.deactivated).toBe(false);
  });

  it('deleteTemplate soft-deactivates when profiles still reference it', async () => {
    vi.spyOn(templateRepository, 'findById').mockResolvedValueOnce(dummyTemplate as any);
    vi.spyOn(templateRepository, 'countProfilesByTemplateId').mockResolvedValueOnce(2);
    const updateSpy = vi
      .spyOn(templateRepository, 'update')
      .mockResolvedValueOnce({ ...dummyTemplate, isActive: false } as any);
    const deleteSpy = vi.spyOn(templateRepository, 'delete');

    const result = await templateService.deleteTemplate('tpl-1');

    expect(result.ok).toBe(true);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith('tpl-1', { isActive: false });

    const data = (result as { ok: true; data: { deactivated: boolean; warning?: string } }).data;
    expect(data.deactivated).toBe(true);
    expect(updateSpy.mock.results[0].value).toBeDefined();
    expect(data.warning).toContain('2 profile(s)');
  });
});
