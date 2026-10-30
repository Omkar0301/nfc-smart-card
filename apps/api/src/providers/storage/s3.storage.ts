import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { StorageFile, StorageProvider } from './storage.types.js';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';

export interface S3StorageOptions {
  client?: S3Client;
  bucket?: string;
  region?: string;
  endpoint?: string;
  publicBaseUrl?: string;
}

export class S3StorageService implements StorageProvider {
  private client: S3Client | null = null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly publicBaseUrl?: string;

  constructor(options?: S3StorageOptions) {
    this.bucket = options?.bucket || config.S3_BUCKET || 'nfc-card-platform';
    this.region = options?.region || config.S3_REGION || 'us-east-1';
    this.endpoint = options?.endpoint || config.S3_ENDPOINT;
    this.publicBaseUrl = options?.publicBaseUrl || config.S3_PUBLIC_BASE_URL;

    if (options?.client) {
      this.client = options.client;
    }
  }

  /**
   * Lazily initialize S3Client to prevent unnecessary overhead or errors when S3 is unused.
   */
  getClient(): S3Client {
    if (!this.client) {
      const s3Config: S3ClientConfig = {
        region: this.region,
      };

      if (this.endpoint) {
        s3Config.endpoint = this.endpoint;
        s3Config.forcePathStyle = true;
      }

      if (config.S3_ACCESS_KEY && config.S3_SECRET_KEY) {
        s3Config.credentials = {
          accessKeyId: config.S3_ACCESS_KEY,
          secretAccessKey: config.S3_SECRET_KEY,
        };
      }

      this.client = new S3Client(s3Config);
    }
    return this.client;
  }

  /**
   * Extract storage key from a full S3 or CDN URL.
   */
  extractKey(keyOrUrl: string): string | null {
    if (!keyOrUrl || typeof keyOrUrl !== 'string') return null;

    let key = keyOrUrl.trim();

    if (this.publicBaseUrl && key.startsWith(this.publicBaseUrl)) {
      return key.slice(this.publicBaseUrl.length).replace(/^[/\\]+/, '');
    }

    const profileMatch = key.match(/(profiles\/[^?#]+)/);
    if (profileMatch) return profileMatch[1];

    const templateMatch = key.match(/(templates\/[^?#]+)/);
    if (templateMatch) return templateMatch[1];

    return key.replace(/^[/\\]+/, '') || null;
  }

  /**
   * Build the public CDN or S3 URL for a given storage key.
   */
  getPublicUrl(key: string): string {
    const cleanKey = (this.extractKey(key) || key).replace(/^[/\\]+/, '');
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${cleanKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${cleanKey}`;
  }

  /**
   * Upload a file to S3 storage.
   */
  async upload(
    arg1: Buffer | string,
    arg2: Buffer | string,
    contentType = 'application/octet-stream'
  ): Promise<string> {
    const buffer = Buffer.isBuffer(arg1) ? arg1 : (arg2 as Buffer);
    const rawKey = typeof arg1 === 'string' ? arg1 : (arg2 as string);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('S3 upload failed: missing or invalid file Buffer');
    }
    if (!rawKey || typeof rawKey !== 'string') {
      throw new Error('S3 upload failed: missing or invalid storage key');
    }

    const cleanKey = (this.extractKey(rawKey) || rawKey).replace(/^[/\\]+/, '');
    const client = this.getClient();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);
    return this.getPublicUrl(cleanKey);
  }

  /**
   * Retrieve a file from S3 storage.
   */
  async retrieve(keyOrUrl: string): Promise<StorageFile | null> {
    const key = this.extractKey(keyOrUrl) || keyOrUrl;
    if (!key) return null;

    try {
      const client = this.getClient();
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await client.send(command);
      if (!response.Body) {
        return null;
      }

      // AWS SDK v3 stream to byte array
      const byteArray = await response.Body.transformToByteArray();
      const buffer = Buffer.from(byteArray);

      return {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
      };
    } catch (error: any) {
      if (
        error.name === 'NoSuchKey' ||
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      logger.error({ key, err: error.message }, '[S3Storage] retrieve failed');
      throw error;
    }
  }

  /**
   * Delete a file from S3 storage (idempotent / best-effort).
   */
  async delete(keyOrUrl: string): Promise<void> {
    try {
      const key = this.extractKey(keyOrUrl) || keyOrUrl;
      if (!key) return;

      const client = this.getClient();
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await client.send(command);
      logger.debug({ key }, '[S3Storage] file deleted successfully');
    } catch (error: any) {
      logger.warn(
        { error: error?.message, keyOrUrl },
        '[S3Storage] best-effort file deletion failed'
      );
    }
  }
}
