import React from 'react';
import type { FieldType } from '@nfc-card/shared';
import styles from './FieldRenderer.module.css';

interface TextFieldProps {
  id: string;
  type: FieldType;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TextField({ id, type, value, placeholder, onChange, disabled }: TextFieldProps) {
  let htmlType = 'text';
  if (type === 'email') htmlType = 'email';
  if (type === 'url') htmlType = 'url';
  if (type === 'phone') htmlType = 'tel';

  return (
    <input
      id={id}
      type={htmlType}
      className={styles.input}
      value={value ?? ''}
      placeholder={placeholder || `Enter ${type}...`}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoComplete="off"
    />
  );
}
