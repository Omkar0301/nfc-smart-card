import React, { useRef, useState, useEffect } from 'react';
import styles from './FieldRenderer.module.css';

interface ListFieldProps {
  id: string;
  value: string[] | string;
  placeholder?: string;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

interface ItemEntry {
  keyId: string;
  text: string;
}

export function ListField({ id: _id, value, placeholder, onChange, disabled }: ListFieldProps) {
  // Normalize incoming value to string array
  const rawItems: string[] = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? value.split('\n').filter(Boolean)
      : [];

  const nextKeyId = useRef(0);
  const [entries, setEntries] = useState<ItemEntry[]>(() =>
    rawItems.map((text) => ({ keyId: `k-${++nextKeyId.current}`, text }))
  );

  // Sync entries when external value array changes length or structure
  useEffect(() => {
    const currentTexts = entries.map((e) => e.text);
    const isDifferent =
      rawItems.length !== currentTexts.length ||
      rawItems.some((item, i) => item !== currentTexts[i]);

    if (isDifferent) {
      setEntries(rawItems.map((text) => ({ keyId: `k-${++nextKeyId.current}`, text })));
    }
  }, [value]);

  const handleItemChange = (index: number, text: string) => {
    const updated = entries.map((entry, i) => (i === index ? { ...entry, text } : entry));
    setEntries(updated);
    onChange(updated.map((e) => e.text));
  };

  const handleAddItem = () => {
    const updated = [...entries, { keyId: `k-${++nextKeyId.current}`, text: '' }];
    setEntries(updated);
    onChange(updated.map((e) => e.text));
  };

  const handleRemoveItem = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    onChange(updated.map((e) => e.text));
  };

  return (
    <div className={styles.listContainer}>
      {entries.map((entry, index) => (
        <div key={entry.keyId} className={styles.listItem}>
          <input
            type="text"
            className={styles.input}
            value={entry.text}
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
