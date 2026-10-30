import { S3StorageService } from '../providers/storage/s3.storage.js';

export const s3StorageService = new S3StorageService();

/**
 * Direct access to S3Client instance.
 */
export const s3Client = s3StorageService.getClient();

/**
 * Build the public CDN/S3 URL for a given storage key.
 */
export function getPublicUrl(key: string): string {
  return s3StorageService.getPublicUrl(key);
}

/**
 * Extract storage key from a full URL if it matches known prefixes.
 */
export function extractKeyFromUrl(url: string): string | null {
  return s3StorageService.extractKey(url);
}

/**
 * Upload a buffer to S3-compatible object storage.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  return s3StorageService.upload(buffer, key, contentType);
}

/**
 * Delete a file from S3-compatible object storage (best-effort).
 */
export async function deleteFile(keyOrUrl: string): Promise<void> {
  return s3StorageService.delete(keyOrUrl);
}
