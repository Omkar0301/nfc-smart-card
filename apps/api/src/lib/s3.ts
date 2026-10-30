import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { logger } from './logger.js';

const s3Config: S3ClientConfig = {
  region: config.S3_REGION || 'us-east-1',
};

if (config.S3_ENDPOINT) {
  s3Config.endpoint = config.S3_ENDPOINT;
  s3Config.forcePathStyle = true;
}

if (config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
  s3Config.credentials = {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  };
}

export const s3Client = new S3Client(s3Config);

/**
 * Build the public CDN/S3 URL for a given storage key.
 */
export function getPublicUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, '');
  if (config.S3_PUBLIC_BASE_URL) {
    return `${config.S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${normalizedKey}`;
  }
  const bucket = config.S3_BUCKET || 'nfc-card-platform';
  const region = config.S3_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}

/**
 * Extract storage key from a full URL if it matches known prefixes.
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  if (config.S3_PUBLIC_BASE_URL && url.startsWith(config.S3_PUBLIC_BASE_URL)) {
    return url.slice(config.S3_PUBLIC_BASE_URL.length).replace(/^\/+/, '');
  }
  const profileMatch = url.match(/(profiles\/[^?#]+)/);
  if (profileMatch) return profileMatch[1];
  const templateMatch = url.match(/(templates\/[^?#]+)/);
  if (templateMatch) return templateMatch[1];
  return null;
}

/**
 * Upload a buffer to S3-compatible object storage.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucket = config.S3_BUCKET || 'nfc-card-platform';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return getPublicUrl(key);
}

/**
 * Delete a file from S3-compatible object storage (best-effort).
 */
export async function deleteFile(keyOrUrl: string): Promise<void> {
  try {
    const key = extractKeyFromUrl(keyOrUrl) || keyOrUrl;
    if (!key) return;

    const bucket = config.S3_BUCKET || 'nfc-card-platform';
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error: any) {
    logger.warn({ error: error?.message, keyOrUrl }, '[s3] best-effort file deletion failed');
  }
}
