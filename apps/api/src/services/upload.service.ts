import crypto from 'node:crypto';
import { ErrorCode } from '@nfc-card/shared';
import { logger } from '../lib/logger.js';
import { storageProvider, StorageProvider } from '../providers/storage.provider.js';
import {
  validateImageFile,
  MAX_PROFILE_PHOTO_SIZE,
  MAX_TEMPLATE_THUMBNAIL_SIZE,
} from '../lib/validateFile.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { templateRepository } from '../repositories/template.repository.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: ErrorCode;
      message: string;
      details?: Record<string, unknown>;
    };

export const uploadService = {
  // Configurable storage provider instance
  _storage: storageProvider as StorageProvider,

  setStorageProvider(provider: StorageProvider) {
    this._storage = provider;
  },

  getStorageProvider(): StorageProvider {
    return this._storage || storageProvider;
  },

  async uploadProfilePhoto(
    userId: string,
    file?: { buffer?: Buffer; size?: number; mimetype?: string } | null
  ): Promise<ServiceResult<{ url: string }>> {
    const validation = validateImageFile(file, MAX_PROFILE_PHOTO_SIZE);
    if (!validation.valid) {
      if (validation.error === 'NO_FILE') {
        return {
          ok: false,
          status: 400,
          code: ErrorCode.NO_FILE,
          message: validation.message,
        };
      }
      if (validation.error === 'FILE_TOO_LARGE') {
        return {
          ok: false,
          status: 400,
          code: ErrorCode.FILE_TOO_LARGE,
          message: validation.message,
          details: { maxSizeMb: validation.maxSizeMb },
        };
      }
      return {
        ok: false,
        status: 415,
        code: ErrorCode.INVALID_FILE_TYPE,
        message: validation.message,
      };
    }

    const { buffer } = file!;
    const randomHex = crypto.randomBytes(4).toString('hex');
    const key = `profiles/${userId}/${Date.now()}-${randomHex}.${validation.ext}`;

    try {
      const storage = this.getStorageProvider();
      const publicUrl = await storage.upload(buffer!, key, validation.mimeType);

      // Best-effort cleanup of old profile photo in storage
      try {
        const assignment = await profileRepository.findActiveAssignmentByUserId(userId);
        if (assignment?.card?.cardTypeId) {
          const profile = await profileRepository.findProfileByUserIdAndCardTypeId(
            userId,
            assignment.card.cardTypeId
          );
          const oldPhoto = (profile?.data as Record<string, any>)?.photo;
          if (oldPhoto && typeof oldPhoto === 'string' && oldPhoto !== publicUrl) {
            await storage.delete(oldPhoto);
          }
        }
      } catch (cleanupErr: any) {
        logger.warn(
          { userId, err: cleanupErr.message },
          '[uploadService] failed to delete old profile photo (best-effort)'
        );
      }

      logger.info({ userId, key, publicUrl }, '[uploadService] profile photo uploaded');
      return { ok: true, data: { url: publicUrl } };
    } catch (err: any) {
      logger.error({ userId, err: err.message }, '[uploadService] profile photo upload failed');
      return {
        ok: false,
        status: 500,
        code: ErrorCode.UPLOAD_FAILED,
        message: 'Failed to upload profile photo to storage',
      };
    }
  },

  async uploadTemplateThumbnail(
    templateId: string,
    file?: { buffer?: Buffer; size?: number; mimetype?: string } | null
  ): Promise<ServiceResult<{ url: string }>> {
    const validation = validateImageFile(file, MAX_TEMPLATE_THUMBNAIL_SIZE);
    if (!validation.valid) {
      if (validation.error === 'NO_FILE') {
        return {
          ok: false,
          status: 400,
          code: ErrorCode.NO_FILE,
          message: validation.message,
        };
      }
      if (validation.error === 'FILE_TOO_LARGE') {
        return {
          ok: false,
          status: 400,
          code: ErrorCode.FILE_TOO_LARGE,
          message: validation.message,
          details: { maxSizeMb: validation.maxSizeMb },
        };
      }
      return {
        ok: false,
        status: 415,
        code: ErrorCode.INVALID_FILE_TYPE,
        message: validation.message,
      };
    }

    const isDraftOrNew = templateId === 'new' || templateId === 'draft';
    let existingTemplate: any = null;

    if (!isDraftOrNew) {
      existingTemplate = await templateRepository.findById(templateId);
      if (!existingTemplate) {
        return {
          ok: false,
          status: 404,
          code: ErrorCode.TEMPLATE_NOT_FOUND,
          message: 'Template not found',
        };
      }
    }

    const { buffer } = file!;
    const randomHex = crypto.randomBytes(4).toString('hex');
    const folderId = isDraftOrNew ? `new-${Date.now()}` : templateId;
    const key = `templates/${folderId}/${Date.now()}-${randomHex}.${validation.ext}`;

    try {
      const storage = this.getStorageProvider();
      const publicUrl = await storage.upload(buffer!, key, validation.mimeType);

      if (existingTemplate) {
        // Best-effort cleanup of previous thumbnail
        if (existingTemplate.thumbnail && existingTemplate.thumbnail !== publicUrl) {
          await storage.delete(existingTemplate.thumbnail);
        }
        // Update template's thumbnail record in DB
        await templateRepository.update(templateId, { thumbnail: publicUrl });
      }

      logger.info({ templateId, key, publicUrl }, '[uploadService] template thumbnail uploaded');
      return { ok: true, data: { url: publicUrl } };
    } catch (err: any) {
      logger.error(
        { templateId, err: err.message },
        '[uploadService] template thumbnail upload failed'
      );
      return {
        ok: false,
        status: 500,
        code: ErrorCode.UPLOAD_FAILED,
        message: 'Failed to upload template thumbnail to storage',
      };
    }
  },

  /**
   * Retrieve a file from storage by its key or URL.
   */
  async getFile(keyOrUrl: string): Promise<ServiceResult<{ buffer: Buffer; contentType: string }>> {
    try {
      const storage = this.getStorageProvider();
      const file = await storage.retrieve(keyOrUrl);
      if (!file) {
        return {
          ok: false,
          status: 404,
          code: ErrorCode.NOT_FOUND,
          message: 'File not found',
        };
      }
      return { ok: true, data: file };
    } catch (err: any) {
      logger.error({ keyOrUrl, err: err?.message }, '[uploadService] failed to retrieve file');
      return {
        ok: false,
        status: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve file from storage',
      };
    }
  },
};
