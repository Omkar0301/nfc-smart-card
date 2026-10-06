import React from 'react';
import styles from './FieldRenderer.module.css';

interface AddressFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AddressField({ id, value, placeholder, onChange, disabled }: AddressFieldProps) {
  return (
    <textarea
      id={id}
      className={styles.textarea}
      value={value ?? ''}
      placeholder={
        placeholder || 'Suite / Building Number, Street\nCity, State, Postal Code\nCountry'
      }
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
    />
  );
}
