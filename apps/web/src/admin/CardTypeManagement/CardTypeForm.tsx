'use client';

import React, { useState } from 'react';
import type { CardType, FieldSchemaItem, FieldType } from '@nfc-card/shared';
import { createCardType, updateCardType } from '../../shared/api/cardTypes';
import styles from './CardTypeManagement.module.css';

interface CardTypeFormProps {
  cardType?: CardType | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const AVAILABLE_FIELD_TYPES: FieldType[] = [
  'text',
  'long_text',
  'image',
  'phone',
  'email',
  'url',
  'address',
  'list_of_strings',
  'select',
];

export function CardTypeForm({ cardType, onSuccess, onCancel }: CardTypeFormProps) {
  const isEditing = Boolean(cardType);

  const [name, setName] = useState(cardType?.name ?? '');
  const [slug, setSlug] = useState(cardType?.slug ?? '');
  const [description, setDescription] = useState(cardType?.description ?? '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    (cardType?.status as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE'
  );

  const [fields, setFields] = useState<FieldSchemaItem[]>(
    cardType?.fieldSchema && cardType.fieldSchema.length > 0
      ? [...cardType.fieldSchema]
      : [
          {
            key: 'name',
            label: 'Full Name',
            type: 'text',
            required: true,
            defaultVisible: true,
            placeholder: 'e.g. John Doe',
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleAddField = () => {
    const newIndex = fields.length + 1;
    setFields([
      ...fields,
      {
        key: `field_${newIndex}`,
        label: `Field ${newIndex}`,
        type: 'text',
        required: false,
        defaultVisible: true,
        placeholder: '',
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    if (fields.length <= 1) {
      setError('A Card Type must have at least one field.');
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...fields];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setFields(reordered);
  };

  const handleFieldChange = (
    index: number,
    key: keyof FieldSchemaItem,
    value: string | boolean
  ) => {
    const updated = [...fields];
    updated[index] = {
      ...updated[index],
      [key]: value,
    };
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!isEditing && !slug.trim()) {
      setError('Slug is required.');
      return;
    }

    // Check duplicate keys
    const seen = new Set<string>();
    for (const f of fields) {
      const lower = f.key.trim().toLowerCase();
      if (!lower) {
        setError('All fields must have a valid key.');
        return;
      }
      if (seen.has(lower)) {
        setError(`Duplicate field key: "${f.key}". Field keys must be unique.`);
        return;
      }
      seen.add(lower);
    }

    setLoading(true);

    try {
      if (isEditing && cardType) {
        const res = await updateCardType(cardType.id, {
          name,
          description,
          status,
          fieldSchema: fields,
        });
        if (res.warning) {
          setWarning(res.warning);
        }
        onSuccess();
      } else {
        await createCardType({
          name,
          slug,
          description,
          fieldSchema: fields,
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message ?? 'An error occurred while saving the card type.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {isEditing ? `Edit Card Type: ${cardType?.name}` : 'Create New Card Type'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onCancel}>
            ×
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {warning && <div className={styles.warningBanner}>Warning: {warning}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Card Type Name *</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="e.g. Doctor Profile"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Slug *{' '}
                {isEditing && <span style={{ color: '#888', fontWeight: 400 }}>(Permanent)</span>}
              </label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="e.g. doctor"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={isEditing}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="e.g. Specialized profile card for healthcare providers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isEditing && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select
                className={styles.formInput}
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          )}

          {/* Dynamic Field Schema Builder */}
          <div className={styles.schemaBuilderSection}>
            <div className={styles.schemaBuilderHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Field Schema Builder</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Define the fields, types, and default public visibility for this vertical.
                </p>
              </div>
              <button type="button" className={styles.secondaryBtn} onClick={handleAddField}>
                + Add Field
              </button>
            </div>

            {fields.map((f, idx) => (
              <div key={idx} className={styles.fieldRow}>
                <div className={styles.fieldRowMain}>
                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                      Key (Variable)
                    </label>
                    <input
                      className={styles.formInput}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
                      type="text"
                      value={f.key}
                      onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                      placeholder="field_key"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                      Label (Display)
                    </label>
                    <input
                      className={styles.formInput}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
                      type="text"
                      value={f.label}
                      onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      placeholder="Field Label"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Type</label>
                    <select
                      className={styles.formInput}
                      style={{ width: '100%', fontSize: 13, padding: '6px 8px' }}
                      value={f.type}
                      onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                    >
                      {AVAILABLE_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.reorderBtns}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleMoveField(idx, 'up')}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleMoveField(idx, 'down')}
                      disabled={idx === fields.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={() => handleRemoveField(idx)}
                      title="Delete field"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className={styles.fieldRowOptions}>
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                    />
                    Required in onboarding
                  </label>

                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={f.defaultVisible}
                      onChange={(e) => handleFieldChange(idx, 'defaultVisible', e.target.checked)}
                    />
                    Default Visible on Public Profile
                  </label>

                  <input
                    className={styles.formInput}
                    style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
                    type="text"
                    placeholder="Placeholder hint (optional)"
                    value={f.placeholder ?? ''}
                    onChange={(e) => handleFieldChange(idx, 'placeholder', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Card Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
