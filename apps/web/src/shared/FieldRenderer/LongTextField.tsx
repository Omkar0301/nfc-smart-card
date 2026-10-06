import React from 'react';
import styles from './FieldRenderer.module.css';

interface LongTextFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LongTextField({ id, value, placeholder, onChange, disabled }: LongTextFieldProps) {
  return (
    <textarea
      id={id}
      className={styles.textarea}
      value={value ?? ''}
      placeholder={placeholder || 'Enter description...'}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
    />
  );
}
