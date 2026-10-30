'use client';

import React, { useState, useRef } from 'react';
import styles from './FieldRenderer.module.css';
import { uploadProfilePhoto } from '../api/upload';

interface ImageFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageField({ id, value, placeholder, onChange, disabled }: ImageFieldProps) {
  const [hasError, setHasError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Client-side pre-validation
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError('File exceeds 5 MB. Please choose a smaller image.');
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    try {
      setUploading(true);
      const res = await uploadProfilePhoto(file);
      setHasError(false);
      onChange(res.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={styles.imageFieldContainer}>
      <div
        className={styles.imagePreview}
        style={{
          borderRadius: '50%',
          width: '76px',
          height: '76px',
          border: value && !hasError ? '2px solid #38bdf8' : undefined,
        }}
      >
        {value && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Profile photo preview"
            onError={() => setHasError(true)}
            onLoad={() => setHasError(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '2rem' }}>👤</span>
        )}
      </div>

      <div className={styles.imageInputGroup}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          aria-label="Upload profile image file"
        />

        <div className={styles.imageActions} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <span className={styles.uploadProgressText}>⏳ Uploading photo…</span>
            ) : value ? (
              '📷 Change Photo'
            ) : (
              '📷 Upload Photo'
            )}
          </button>

          {value && (
            <button
              type="button"
              className={styles.smallBtn}
              style={{ minHeight: '44px', padding: '8px 12px' }}
              onClick={() => {
                setHasError(false);
                setUploadError(null);
                onChange('');
              }}
              disabled={disabled || uploading}
            >
              Remove
            </button>
          )}

          <button
            type="button"
            className={styles.visibilityToggle}
            style={{ color: '#94a3b8', fontSize: '0.75rem', padding: '6px 8px' }}
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            {showUrlInput ? 'Hide URL input' : 'Enter URL manually'}
          </button>
        </div>

        {uploadError && <div className={styles.uploadErrorText}>⚠️ {uploadError}</div>}

        {showUrlInput && (
          <div style={{ marginTop: '6px' }}>
            <input
              id={id}
              type="url"
              className={styles.input}
              value={value ?? ''}
              placeholder={placeholder || 'https://example.com/photo.jpg'}
              onChange={(e) => {
                setHasError(false);
                setUploadError(null);
                onChange(e.target.value);
              }}
              disabled={disabled || uploading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
