'use client';

import React, { useState, useRef } from 'react';
import styles from './TemplateManagement.module.css';
import { uploadTemplateThumbnail } from '../../shared/api/upload';

interface ThumbnailUploadProps {
  thumbnailUrl: string;
  templateId: string;
  onThumbnailChange: (url: string) => void;
  disabled?: boolean;
}

const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ThumbnailUpload({
  thumbnailUrl,
  templateId,
  onThumbnailChange,
  disabled,
}: ThumbnailUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasImgError, setHasImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError('Thumbnail exceeds 2 MB. Please choose a smaller image.');
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    try {
      setUploading(true);
      const res = await uploadTemplateThumbnail(file, templateId || 'new');
      setHasImgError(false);
      onThumbnailChange(res.url);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload thumbnail.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '90px',
            height: '60px',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '1.2rem',
            flexShrink: 0,
          }}
        >
          {thumbnailUrl && !hasImgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt="Template thumbnail preview"
              onError={() => setHasImgError(true)}
              onLoad={() => setHasImgError(false)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>🖼️</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={disabled || uploading}
            aria-label="Upload template thumbnail file"
          />

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            style={{ minHeight: '40px' }}
          >
            {uploading
              ? '⏳ Uploading…'
              : thumbnailUrl
                ? '📷 Replace Thumbnail'
                : '📷 Upload Thumbnail'}
          </button>

          {thumbnailUrl && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                setHasImgError(false);
                setError(null);
                onThumbnailChange('');
              }}
              disabled={disabled || uploading}
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '2px' }}>⚠️ {error}</div>
      )}
    </div>
  );
}
