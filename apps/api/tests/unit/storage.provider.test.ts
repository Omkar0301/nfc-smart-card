import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  LocalStorageService,
  S3StorageService,
  createStorageProvider,
  storageProvider,
} from '../../src/providers/storage.provider.js';

describe('Storage Provider Abstraction (LocalStorageService & S3StorageService)', () => {
  let tempDir: string;
  let localService: LocalStorageService;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nfc-storage-test-'));
    localService = new LocalStorageService({
      uploadDir: tempDir,
      baseUrl: 'http://localhost:4000/uploads',
    });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
    vi.restoreAllMocks();
  });

  describe('LocalStorageService', () => {
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    it('uploads a file successfully and organizes in directories', async () => {
      const key = 'profiles/user-123/avatar.jpg';
      const url = await localService.upload(validJpeg, key, 'image/jpeg');

      expect(url).toBe('http://localhost:4000/uploads/profiles/user-123/avatar.jpg');

      const expectedPath = path.join(tempDir, 'profiles', 'user-123', 'avatar.jpg');
      expect(fs.existsSync(expectedPath)).toBe(true);

      const savedBuffer = await fs.promises.readFile(expectedPath);
      expect(savedBuffer).toEqual(validJpeg);
    });

    it('supports alternative argument order upload(key, buffer, contentType)', async () => {
      const key = 'templates/tpl-1/thumb.png';
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const url = await localService.upload(key, fakePng, 'image/png');

      expect(url).toBe('http://localhost:4000/uploads/templates/tpl-1/thumb.png');
      const expectedPath = path.join(tempDir, 'templates', 'tpl-1', 'thumb.png');
      expect(fs.existsSync(expectedPath)).toBe(true);
    });

    it('retrieves an existing file with content type', async () => {
      const key = 'profiles/user-1/photo.jpg';
      await localService.upload(validJpeg, key, 'image/jpeg');

      const result = await localService.retrieve(key);
      expect(result).not.toBeNull();
      expect(result?.buffer).toEqual(validJpeg);
      expect(result?.contentType).toBe('image/jpeg');
    });

    it('retrieves an existing file using full URL', async () => {
      const key = 'profiles/user-1/photo.jpg';
      const url = await localService.upload(validJpeg, key, 'image/jpeg');

      const result = await localService.retrieve(url);
      expect(result).not.toBeNull();
      expect(result?.buffer).toEqual(validJpeg);
      expect(result?.contentType).toBe('image/jpeg');
    });

    it('returns null when retrieving non-existent file', async () => {
      const result = await localService.retrieve('non-existent/file.jpg');
      expect(result).toBeNull();
    });

    it('deletes an existing file', async () => {
      const key = 'profiles/user-1/photo.jpg';
      await localService.upload(validJpeg, key, 'image/jpeg');

      const expectedPath = path.join(tempDir, 'profiles', 'user-1', 'photo.jpg');
      expect(fs.existsSync(expectedPath)).toBe(true);

      await localService.delete(key);
      expect(fs.existsSync(expectedPath)).toBe(false);
    });

    it('deleting a non-existent file does not throw (idempotent)', async () => {
      await expect(localService.delete('non-existent/file.jpg')).resolves.toBeUndefined();
    });

    it('blocks path traversal attacks on upload', async () => {
      await expect(
        localService.upload(validJpeg, '../../etc/passwd', 'image/jpeg')
      ).rejects.toThrow(/Path traversal attempt detected/);

      await expect(
        localService.upload(validJpeg, 'profiles/../../evil.txt', 'text/plain')
      ).rejects.toThrow(/Path traversal attempt detected/);
    });

    it('blocks path traversal attacks on retrieve', async () => {
      await expect(localService.retrieve('../../../windows/win.ini')).rejects.toThrow(
        /Path traversal attempt detected/
      );
    });

    it('blocks path traversal attacks on delete', async () => {
      await expect(localService.delete('../../important-file.txt')).rejects.toThrow(
        /Path traversal attempt detected/
      );
    });

    it('extracts key correctly from URLs and relative paths', () => {
      expect(localService.extractKey('profiles/u1/photo.jpg')).toBe('profiles/u1/photo.jpg');
      expect(localService.extractKey('http://localhost:4000/uploads/profiles/u1/photo.jpg')).toBe(
        'profiles/u1/photo.jpg'
      );
      expect(localService.extractKey('/uploads/templates/t1/thumb.png')).toBe(
        'templates/t1/thumb.png'
      );
    });
  });

  describe('S3StorageService', () => {
    it('uploads a file using PutObjectCommand', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const mockClient = { send: mockSend } as any;

      const s3Service = new S3StorageService({
        client: mockClient,
        bucket: 'my-test-bucket',
        region: 'us-west-2',
        publicBaseUrl: 'https://cdn.example.com',
      });

      const buffer = Buffer.from('test-image-content');
      const url = await s3Service.upload(buffer, 'profiles/user-1/avatar.jpg', 'image/jpeg');

      expect(url).toBe('https://cdn.example.com/profiles/user-1/avatar.jpg');
      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe('my-test-bucket');
      expect(command.input.Key).toBe('profiles/user-1/avatar.jpg');
      expect(command.input.ContentType).toBe('image/jpeg');
    });

    it('retrieves a file using GetObjectCommand', async () => {
      const fileBuffer = Buffer.from('s3-file-data');
      const mockSend = vi.fn().mockResolvedValue({
        Body: {
          transformToByteArray: async () => new Uint8Array(fileBuffer),
        },
        ContentType: 'image/png',
      });
      const mockClient = { send: mockSend } as any;

      const s3Service = new S3StorageService({
        client: mockClient,
        bucket: 'my-test-bucket',
      });

      const result = await s3Service.retrieve('templates/tpl-1/thumb.png');
      expect(result).not.toBeNull();
      expect(result?.buffer).toEqual(fileBuffer);
      expect(result?.contentType).toBe('image/png');
    });

    it('returns null when S3 GetObjectCommand throws NoSuchKey', async () => {
      const notFoundError = new Error('The specified key does not exist.');
      notFoundError.name = 'NoSuchKey';
      const mockSend = vi.fn().mockRejectedValue(notFoundError);
      const mockClient = { send: mockSend } as any;

      const s3Service = new S3StorageService({
        client: mockClient,
        bucket: 'my-test-bucket',
      });

      const result = await s3Service.retrieve('templates/missing.png');
      expect(result).toBeNull();
    });

    it('deletes a file using DeleteObjectCommand', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const mockClient = { send: mockSend } as any;

      const s3Service = new S3StorageService({
        client: mockClient,
        bucket: 'my-test-bucket',
      });

      await s3Service.delete('profiles/user-1/avatar.jpg');
      expect(mockSend).toHaveBeenCalledOnce();
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe('my-test-bucket');
      expect(command.input.Key).toBe('profiles/user-1/avatar.jpg');
    });
  });

  describe('Storage Factory (createStorageProvider)', () => {
    it('creates LocalStorageService when requested', () => {
      const provider = createStorageProvider('local');
      expect(provider).toBeInstanceOf(LocalStorageService);
    });

    it('creates S3StorageService when requested', () => {
      const provider = createStorageProvider('s3');
      expect(provider).toBeInstanceOf(S3StorageService);
    });

    it('throws error for unsupported provider', () => {
      expect(() => createStorageProvider('gcs' as any)).toThrow(/Unsupported STORAGE_PROVIDER/);
    });

    it('storageProvider default instance is LocalStorageService', () => {
      expect(storageProvider).toBeInstanceOf(LocalStorageService);
    });
  });
});
