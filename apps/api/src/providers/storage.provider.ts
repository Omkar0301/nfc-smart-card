import { StorageProvider } from './storage/storage.types.js';
import { LocalStorageService, resolveUploadDir } from './storage/local.storage.js';
import { S3StorageService } from './storage/s3.storage.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export * from './storage/storage.types.js';
export { LocalStorageService, resolveUploadDir } from './storage/local.storage.js';
export { S3StorageService } from './storage/s3.storage.js';

export const LocalStorageProvider = LocalStorageService;
export const S3StorageProvider = S3StorageService;

/**
 * Factory function to create a storage provider instance based on type or config.
 */
export function createStorageProvider(type?: 'local' | 's3'): StorageProvider {
  const providerType = type || config.STORAGE_PROVIDER || 'local';

  if (providerType === 'local') {
    logger.info({ provider: 'local' }, '[storage] initializing LocalStorageService');
    return new LocalStorageService();
  }

  if (providerType === 's3') {
    logger.info({ provider: 's3' }, '[storage] initializing S3StorageService');
    return new S3StorageService();
  }

  throw new Error(`Unsupported STORAGE_PROVIDER: ${providerType}`);
}

/**
 * Active application storage provider instance.
 */
export const storageProvider: StorageProvider = createStorageProvider();

/**
 * Helper to get the resolved local uploads directory path.
 */
export function getUploadDir(): string {
  return resolveUploadDir();
}
