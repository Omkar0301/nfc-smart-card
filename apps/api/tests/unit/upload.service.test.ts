import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadService } from '../../src/services/upload.service.js';
import { storageProvider, StorageProvider } from '../../src/providers/storage.provider.js';
import { profileRepository } from '../../src/repositories/profile.repository.js';
import { templateRepository } from '../../src/repositories/template.repository.js';
import { ErrorCode } from '@nfc-card/shared';

describe('Upload Service Unit Tests (F-016 & Local Storage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  it('rejects profile photo upload when no file is provided', async () => {
    const result = await uploadService.uploadProfilePhoto('user-1', null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.code).toBe(ErrorCode.NO_FILE);
    }
  });

  it('rejects profile photo upload when file exceeds 5 MB', async () => {
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;

    const result = await uploadService.uploadProfilePhoto('user-1', {
      buffer: largeBuffer,
      size: largeBuffer.length,
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.code).toBe(ErrorCode.FILE_TOO_LARGE);
      expect(result.details?.maxSizeMb).toBe(5);
    }
  });

  it('rejects profile photo upload when file is invalid magic bytes', async () => {
    const fakeBuffer = Buffer.from('this is not an image at all');
    const result = await uploadService.uploadProfilePhoto('user-1', {
      buffer: fakeBuffer,
      size: fakeBuffer.length,
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(415);
      expect(result.code).toBe(ErrorCode.INVALID_FILE_TYPE);
    }
  });

  it('uploads valid profile photo to storage and cleans up old photo', async () => {
    const mockUpload = vi
      .spyOn(storageProvider, 'upload')
      .mockResolvedValue('http://localhost:4000/uploads/profiles/user-1/new.jpg');
    const mockDelete = vi.spyOn(storageProvider, 'delete').mockResolvedValue();

    vi.spyOn(profileRepository, 'findActiveAssignmentByUserId').mockResolvedValue({
      card: { cardTypeId: 'ct-business' },
    } as any);
    vi.spyOn(profileRepository, 'findProfileByUserIdAndCardTypeId').mockResolvedValue({
      data: { photo: 'http://localhost:4000/uploads/profiles/user-1/old.jpg' },
    } as any);

    const result = await uploadService.uploadProfilePhoto('user-1', {
      buffer: validJpegBuffer,
      size: validJpegBuffer.length,
    } as any);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('http://localhost:4000/uploads/profiles/user-1/new.jpg');
    }
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith(
      'http://localhost:4000/uploads/profiles/user-1/old.jpg'
    );
  });

  it('returns 500 UPLOAD_FAILED if storage provider throws on profile photo upload', async () => {
    vi.spyOn(storageProvider, 'upload').mockRejectedValue(new Error('Disk write error'));

    const result = await uploadService.uploadProfilePhoto('user-1', {
      buffer: validJpegBuffer,
      size: validJpegBuffer.length,
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.code).toBe(ErrorCode.UPLOAD_FAILED);
    }
  });

  it('rejects template thumbnail upload if template is not found', async () => {
    vi.spyOn(templateRepository, 'findById').mockResolvedValue(null);

    const result = await uploadService.uploadTemplateThumbnail('tpl-non-existent', {
      buffer: validPngBuffer,
      size: validPngBuffer.length,
    } as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
    }
  });

  it('uploads valid template thumbnail to storage and updates template record', async () => {
    const mockUpload = vi
      .spyOn(storageProvider, 'upload')
      .mockResolvedValue('http://localhost:4000/uploads/templates/tpl-1/new.png');
    const mockDelete = vi.spyOn(storageProvider, 'delete').mockResolvedValue();

    vi.spyOn(templateRepository, 'findById').mockResolvedValue({
      id: 'tpl-1',
      thumbnail: 'http://localhost:4000/uploads/templates/tpl-1/old.png',
    } as any);
    const mockUpdate = vi.spyOn(templateRepository, 'update').mockResolvedValue({} as any);

    const result = await uploadService.uploadTemplateThumbnail('tpl-1', {
      buffer: validPngBuffer,
      size: validPngBuffer.length,
    } as any);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('http://localhost:4000/uploads/templates/tpl-1/new.png');
    }
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith(
      'http://localhost:4000/uploads/templates/tpl-1/old.png'
    );
    expect(mockUpdate).toHaveBeenCalledWith('tpl-1', {
      thumbnail: 'http://localhost:4000/uploads/templates/tpl-1/new.png',
    });
  });

  it('allows draft/new template thumbnail upload without requiring existing db record', async () => {
    const mockUpload = vi
      .spyOn(storageProvider, 'upload')
      .mockResolvedValue('http://localhost:4000/uploads/templates/new-123/new.png');

    const result = await uploadService.uploadTemplateThumbnail('new', {
      buffer: validPngBuffer,
      size: validPngBuffer.length,
    } as any);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('http://localhost:4000/uploads/templates/new-123/new.png');
    }
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it('retrieves an existing file via getFile', async () => {
    vi.spyOn(storageProvider, 'retrieve').mockResolvedValue({
      buffer: validJpegBuffer,
      contentType: 'image/jpeg',
    });

    const result = await uploadService.getFile('profiles/user-1/photo.jpg');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.buffer).toEqual(validJpegBuffer);
      expect(result.data.contentType).toBe('image/jpeg');
    }
  });

  it('returns 404 when getFile target does not exist in storage', async () => {
    vi.spyOn(storageProvider, 'retrieve').mockResolvedValue(null);

    const result = await uploadService.getFile('profiles/user-1/missing.jpg');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.code).toBe(ErrorCode.NOT_FOUND);
    }
  });
});
