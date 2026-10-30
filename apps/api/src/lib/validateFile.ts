export type AllowedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';
export type AllowedExt = 'jpg' | 'png' | 'webp';

export interface FileValidationSuccess {
  valid: true;
  mimeType: AllowedMimeType;
  ext: AllowedExt;
}

export interface FileValidationFailure {
  valid: false;
  error: 'NO_FILE' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE';
  message: string;
  maxSizeMb?: number;
}

export type FileValidationResult = FileValidationSuccess | FileValidationFailure;

export const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_TEMPLATE_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Detect image type by checking file magic bytes (file signature).
 * Never trust client-declared Content-Type header.
 */
export function detectImageType(
  buffer: Buffer
): { mimeType: AllowedMimeType; ext: AllowedExt } | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  // RIFF: 0x52 0x49 0x46 0x46
  // WEBP: 0x57 0x45 0x42 0x50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Validate file buffer against maximum size and magic bytes signature.
 */
export function validateImageFile(
  file: { buffer?: Buffer; size?: number } | undefined | null,
  maxSizeBytes: number
): FileValidationResult {
  const maxSizeMb = Math.round(maxSizeBytes / (1024 * 1024));

  if (!file || !file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      error: 'NO_FILE',
      message: 'No file was provided in the request',
    };
  }

  const actualSize = file.size ?? file.buffer.length;
  if (actualSize > maxSizeBytes) {
    return {
      valid: false,
      error: 'FILE_TOO_LARGE',
      message: `File size exceeds maximum allowed limit of ${maxSizeMb} MB`,
      maxSizeMb,
    };
  }

  const detected = detectImageType(file.buffer);
  if (!detected) {
    return {
      valid: false,
      error: 'INVALID_FILE_TYPE',
      message: 'Unsupported media type. Allowed formats: JPEG, PNG, WebP',
    };
  }

  return {
    valid: true,
    mimeType: detected.mimeType,
    ext: detected.ext,
  };
}
