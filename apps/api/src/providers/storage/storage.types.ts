export interface StorageFile {
  buffer: Buffer;
  contentType: string;
}

export interface StorageProvider {
  /**
   * Upload a file buffer to storage.
   * Supports both (buffer, key, contentType) and (key, buffer, contentType)
   * @param arg1 Buffer or key
   * @param arg2 Key or Buffer
   * @param contentType MIME type of the file
   * @returns Public URL of the uploaded file
   */
  upload(arg1: Buffer | string, arg2: Buffer | string, contentType?: string): Promise<string>;

  /**
   * Retrieve a file from storage by its key or URL.
   * @param keyOrUrl Relative storage key or full URL
   * @returns StorageFile with buffer and contentType, or null if not found
   */
  retrieve(keyOrUrl: string): Promise<StorageFile | null>;

  /**
   * Delete a file from storage by its key or URL (idempotent / best-effort).
   * @param keyOrUrl Relative storage key or full URL
   */
  delete(keyOrUrl: string): Promise<void>;

  /**
   * Get the public URL for a given storage key.
   * @param key Relative storage key
   */
  getPublicUrl(key: string): string;

  /**
   * Extract the relative storage key from a full URL or key string.
   * @param keyOrUrl Full URL or relative key
   */
  extractKey(keyOrUrl: string): string | null;
}

export type StorageService = StorageProvider;
