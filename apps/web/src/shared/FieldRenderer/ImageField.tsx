import React, { useState } from 'react';
import styles from './FieldRenderer.module.css';

interface ImageFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageField({ id, value, placeholder, onChange, disabled }: ImageFieldProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className={styles.imageFieldContainer}>
      <div className={styles.imagePreview}>
        {value && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            onError={() => setHasError(true)}
            onLoad={() => setHasError(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>🖼️</span>
        )}
      </div>

      <div className={styles.imageInputGroup}>
        <input
          id={id}
          type="url"
          className={styles.input}
          value={value ?? ''}
          placeholder={placeholder || 'https://example.com/photo.jpg'}
          onChange={(e) => {
            setHasError(false);
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
        {value && (
          <div className={styles.imageActions}>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={() => {
                setHasError(false);
                onChange('');
              }}
              disabled={disabled}
            >
              Remove Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
