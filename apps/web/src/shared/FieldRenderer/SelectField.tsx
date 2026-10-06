import React from 'react';
import styles from './FieldRenderer.module.css';

interface SelectFieldProps {
  id: string;
  value: string;
  options?: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectField({
  id,
  value,
  options = [],
  placeholder,
  onChange,
  disabled,
}: SelectFieldProps) {
  return (
    <select
      id={id}
      className={styles.select}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder || 'Select an option...'}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
