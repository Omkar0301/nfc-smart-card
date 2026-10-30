import fs from 'node:fs';
import path from 'node:path';
import { StorageFile, StorageProvider } from './storage.types.js';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';
import { detectImageType } from '../../lib/validateFile.js';

export interface LocalStorageOptions {
  uploadDir?: string;
  baseUrl?: string;
}

/**
 * Resolve the project's root uploads directory.
 */
export function resolveUploadDir(configuredDir?: string): string {
  const target = configuredDir || config.UPLOAD_DIR || 'uploads';
  if (path.isAbsolute(target)) {
    return target;
  }
  // When running from apps/api vs repo root
  const rootDir = fs.existsSync(path.resolve(process.cwd(), 'apps/api'))
    ? process.cwd()
    : fs.existsSync(path.resolve(process.cwd(), '../../package.json'))
      ? path.resolve(process.cwd(), '../..')
      : process.cwd();
  return path.resolve(rootDir, target);
}

export class LocalStorageService implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(options?: LocalStorageOptions) {
    this.uploadDir = resolveUploadDir(options?.uploadDir);
    this.baseUrl = (
      options?.baseUrl ||
      config.UPLOAD_BASE_URL ||
      `http://localhost:${config.PORT || 4000}/uploads`
    ).replace(/\/+$/, '');

    // Ensure uploads root directory exists on initialization
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (err: any) {
        logger.warn(
          { uploadDir: this.uploadDir, err: err?.message },
          '[LocalStorage] failed to create uploadDir'
        );
      }
    }
  }

  /**
   * Get the directory where files are stored.
   */
  getDirectory(): string {
    return this.uploadDir;
  }

  /**
   * Safely extract the relative storage key from a key or URL string.
   */
  extractKey(keyOrUrl: string): string | null {
    if (!keyOrUrl || typeof keyOrUrl !== 'string') return null;

    let key = keyOrUrl.trim();

    // If key starts with the configured baseUrl
    if (this.baseUrl && key.startsWith(this.baseUrl)) {
      key = key.slice(this.baseUrl.length);
    }

    // If full URL with http:// or https://
    try {
      if (key.startsWith('http://') || key.startsWith('https://')) {
        const parsed = new URL(key);
        key = parsed.pathname;
      }
    } catch {
      // Not a valid URL, treat as raw path
    }

    // Strip leading /uploads/ or uploads/ prefix if present
    key = key.replace(/^\/?uploads\/?/, '');

    // Strip leading slashes and backslashes
    key = key.replace(/^[/\\]+/, '');

    // Common pattern fallbacks (profiles/... or templates/...)
    const profileMatch = key.match(/(profiles\/[^?#]+)/);
    if (profileMatch) return profileMatch[1];

    const templateMatch = key.match(/(templates\/[^?#]+)/);
    if (templateMatch) return templateMatch[1];

    return key || null;
  }

  /**
   * Safely resolve a key to a local filesystem path and prevent path traversal.
   */
  safeResolvePath(keyOrUrl: string): string {
    const key = this.extractKey(keyOrUrl);
    if (!key) {
      throw new Error('Invalid storage key: empty or missing');
    }

    // Decode URL encoding if present
    let decoded = key;
    try {
      decoded = decodeURIComponent(key);
    } catch {
      // Ignore decoding failure, use original
    }

    // Prevent drive-letter spoofing (e.g. C: or D:) and strip leading slashes
    const sanitized = decoded.replace(/^[a-zA-Z]:[/\\]*/, '').replace(/^[/\\]+/, '');

    const normalizedBase = path.resolve(this.uploadDir);
    const resolvedPath = path.resolve(normalizedBase, sanitized);

    // Verify path containment within base directory
    if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
      throw new Error(`Path traversal attempt detected: ${keyOrUrl}`);
    }

    return resolvedPath;
  }

  /**
   * Build the public accessible URL for a given storage key.
   */
  getPublicUrl(key: string): string {
    const cleanKey = (this.extractKey(key) || key).replace(/^[/\\]+/, '').replace(/\\/g, '/');
    return `${this.baseUrl}/${cleanKey}`;
  }

  /**
   * Upload a file to local storage.
   */
  async upload(
    arg1: Buffer | string,
    arg2: Buffer | string,
    _contentType?: string
  ): Promise<string> {
    const buffer = Buffer.isBuffer(arg1) ? arg1 : (arg2 as Buffer);
    const rawKey = typeof arg1 === 'string' ? arg1 : (arg2 as string);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Upload failed: missing or invalid file Buffer');
    }
    if (!rawKey || typeof rawKey !== 'string') {
      throw new Error('Upload failed: missing or invalid storage key');
    }

    const resolvedPath = this.safeResolvePath(rawKey);

    // Ensure parent directory exists
    await fs.promises.mkdir(path.dirname(resolvedPath), { recursive: true });

    // Write file to disk
    await fs.promises.writeFile(resolvedPath, buffer);

    logger.debug({ key: rawKey, path: resolvedPath }, '[LocalStorage] file written successfully');

    return this.getPublicUrl(rawKey);
  }

  /**
   * Retrieve a file from local storage.
   */
  async retrieve(keyOrUrl: string): Promise<StorageFile | null> {
    try {
      const resolvedPath = this.safeResolvePath(keyOrUrl);

      // Check if file exists
      try {
        await fs.promises.access(resolvedPath, fs.constants.R_OK);
      } catch {
        return null;
      }

      const buffer = await fs.promises.readFile(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();

      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      } else {
        const detected = detectImageType(buffer);
        if (detected) {
          contentType = detected.mimeType;
        }
      }

      return { buffer, contentType };
    } catch (err: any) {
      if (err.message?.includes('Path traversal attempt detected')) {
        throw err;
      }
      logger.error({ keyOrUrl, err: err?.message }, '[LocalStorage] file retrieval failed');
      return null;
    }
  }

  /**
   * Delete a file from local storage (idempotent / best-effort).
   */
  async delete(keyOrUrl: string): Promise<void> {
    try {
      const resolvedPath = this.safeResolvePath(keyOrUrl);
      try {
        await fs.promises.unlink(resolvedPath);
        logger.debug({ keyOrUrl, path: resolvedPath }, '[LocalStorage] file deleted successfully');
      } catch (unlinkErr: any) {
        if (unlinkErr.code !== 'ENOENT') {
          logger.warn(
            { keyOrUrl, err: unlinkErr?.message },
            '[LocalStorage] best-effort deletion failed'
          );
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Path traversal attempt detected')) {
        throw err;
      }
      logger.warn({ keyOrUrl, err: err?.message }, '[LocalStorage] best-effort deletion failed');
    }
  }
}
