import React from 'react';
import styles from './FieldRenderer.module.css';

interface ListFieldProps {
  id: string;
  value: string[] | string;
  placeholder?: string;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function ListField({ id, value, placeholder, onChange, disabled }: ListFieldProps) {
  // Normalize value to array of strings
  const items: string[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? value.split('\n').filter(Boolean)
      : [];

  const handleItemChange = (index: number, text: string) => {
    const updated = [...items];
    updated[index] = text;
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className={styles.listContainer}>
      {items.map((item, index) => (
        <div key={`${id}-${index}`} className={styles.listItem}>
          <input
            type="text"
            className={styles.input}
            value={item}
            placeholder={placeholder || `Item ${index + 1}`}
            onChange={(e) => handleItemChange(index, e.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className={styles.listDeleteBtn}
            onClick={() => handleRemoveItem(index)}
            disabled={disabled}
            title="Remove item"
            aria-label={`Remove item ${index + 1}`}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        className={styles.addListItemBtn}
        onClick={handleAddItem}
        disabled={disabled}
      >
        + Add Item
      </button>
    </div>
  );
}
