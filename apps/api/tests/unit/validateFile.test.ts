import { describe, it, expect } from 'vitest';
import {
  detectImageType,
  validateImageFile,
  MAX_PROFILE_PHOTO_SIZE,
  MAX_TEMPLATE_THUMBNAIL_SIZE,
} from '../../src/lib/validateFile.js';

describe('validateFile (Magic Bytes & Size Validation)', () => {
  it('detects JPEG files by magic bytes FF D8 FF', () => {
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    const result = detectImageType(jpegBuffer);
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe('image/jpeg');
    expect(result?.ext).toBe('jpg');
  });

  it('detects PNG files by magic bytes 89 50 4E 47 0D 0A 1A 0A', () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const result = detectImageType(pngBuffer);
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe('image/png');
    expect(result?.ext).toBe('png');
  });

  it('detects WebP files by RIFF + WEBP signature', () => {
    const webpBuffer = Buffer.from([
      0x52,
      0x49,
      0x46,
      0x46, // RIFF
      0x20,
      0x00,
      0x00,
      0x00, // length
      0x57,
      0x45,
      0x42,
      0x50, // WEBP
    ]);
    const result = detectImageType(webpBuffer);
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe('image/webp');
    expect(result?.ext).toBe('webp');
  });

  it('rejects plain text files pretending to be images', () => {
    const textBuffer = Buffer.from('Hello world! Not an image.');
    const result = detectImageType(textBuffer);
    expect(result).toBeNull();
  });

  it('rejects short buffers smaller than 12 bytes', () => {
    const shortBuffer = Buffer.from([0xff, 0xd8, 0xff]);
    const result = detectImageType(shortBuffer);
    expect(result).toBeNull();
  });

  it('returns NO_FILE error if file or buffer is missing', () => {
    const result = validateImageFile(null, MAX_PROFILE_PHOTO_SIZE);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('NO_FILE');
    }
  });

  it('returns FILE_TOO_LARGE when file exceeds max size limit', () => {
    const largeBuffer = Buffer.alloc(MAX_PROFILE_PHOTO_SIZE + 100);
    // write JPEG header so it would otherwise be valid
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;

    const result = validateImageFile(
      { buffer: largeBuffer, size: largeBuffer.length },
      MAX_PROFILE_PHOTO_SIZE
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('FILE_TOO_LARGE');
      expect(result.maxSizeMb).toBe(5);
    }
  });

  it('returns INVALID_FILE_TYPE when buffer is not an allowed image format', () => {
    const fakeBuffer = Buffer.from('GIF89a Fake Image Content');
    const result = validateImageFile(
      { buffer: fakeBuffer, size: fakeBuffer.length },
      MAX_PROFILE_PHOTO_SIZE
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('INVALID_FILE_TYPE');
    }
  });

  it('successfully validates a valid PNG file under max size', () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const result = validateImageFile(
      { buffer: pngBuffer, size: pngBuffer.length },
      MAX_TEMPLATE_THUMBNAIL_SIZE
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mimeType).toBe('image/png');
      expect(result.ext).toBe('png');
    }
  });
});
