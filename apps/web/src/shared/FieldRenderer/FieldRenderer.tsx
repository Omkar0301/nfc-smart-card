import React from 'react';
import type { FieldSchemaItem } from '@nfc-card/shared';
import { TextField } from './TextField';
import { LongTextField } from './LongTextField';
import { ImageField } from './ImageField';
import { AddressField } from './AddressField';
import { ListField } from './ListField';
import { SelectField } from './SelectField';
import styles from './FieldRenderer.module.css';

export interface FieldRendererProps {
  field: FieldSchemaItem;
  value: any;
  isVisible: boolean;
  onChange: (value: any) => void;
  onToggleVisibility: (visible: boolean) => void;
  disabled?: boolean;
}

export function FieldRenderer({
  field,
  value,
  isVisible,
  onChange,
  onToggleVisibility,
  disabled,
}: FieldRendererProps) {
  const inputId = `field-${field.key}`;

  const renderInputControl = () => {
    switch (field.type) {
      case 'long_text':
        return (
          <LongTextField
            id={inputId}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'image':
        return (
          <ImageField
            id={inputId}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'address':
        return (
          <AddressField
            id={inputId}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'list_of_strings':
        return (
          <ListField
            id={inputId}
            value={value ?? []}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <SelectField
            id={inputId}
            value={value ?? ''}
            options={field.options}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
      default:
        return (
          <TextField
            id={inputId}
            type={field.type}
            value={value ?? ''}
            placeholder={field.placeholder}
            onChange={onChange}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={styles.fieldWrapper}>
      <div className={styles.fieldHeader}>
        <div className={styles.labelGroup}>
          <label htmlFor={inputId} className={styles.label}>
            {field.label}
          </label>
          {field.required && (
            <span className={styles.requiredBadge} title="This field is mandatory">
              Required
            </span>
          )}
        </div>

        <button
          type="button"
          className={`${styles.visibilityToggle} ${
            isVisible ? styles.visibleBtn : styles.hiddenBtn
          }`}
          onClick={() => onToggleVisibility(!isVisible)}
          disabled={disabled}
          title={
            isVisible
              ? 'Visible on public profile. Click to hide.'
              : 'Hidden from public profile. Click to show.'
          }
          aria-label={`${field.label} visibility: ${isVisible ? 'Public' : 'Hidden'}`}
        >
          {isVisible ? '👁️ Public' : '🔒 Hidden'}
        </button>
      </div>

      {field.helpText && <p className={styles.helpText}>{field.helpText}</p>}

      <div className={styles.controlContainer}>{renderInputControl()}</div>
    </div>
  );
}
