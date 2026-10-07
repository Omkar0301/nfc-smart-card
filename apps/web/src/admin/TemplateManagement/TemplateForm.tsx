'use client';

import { useState } from 'react';
import type { CardType, TemplateSummary } from '@nfc-card/shared';
import { createTemplate, updateTemplate } from '../../shared/api/templates';
import styles from './TemplateManagement.module.css';

export interface TemplateFormProps {
  template: TemplateSummary | null;
  cardTypes: CardType[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TemplateForm({ template, cardTypes, onSuccess, onCancel }: TemplateFormProps) {
  const isEdit = Boolean(template);
  const [cardTypeId, setCardTypeId] = useState(template?.cardTypeId ?? cardTypes[0]?.id ?? '');
  const [name, setName] = useState(template?.name ?? '');
  const [slug, setSlug] = useState(template?.slug ?? '');
  const [thumbnail, setThumbnail] = useState(template?.thumbnail ?? '');
  const [description, setDescription] = useState(
    typeof template?.configuration?.description === 'string'
      ? (template.configuration.description as string)
      : ''
  );
  const [isPremium, setIsPremium] = useState(template?.isPremium ?? false);
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(template?.sortOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && (!cardTypeId || !name.trim() || !slug.trim())) {
      setError('Card type, name, and slug are required.');
      return;
    }

    const configuration = description.trim() ? { description: description.trim() } : {};

    try {
      setSubmitting(true);
      if (template) {
        await updateTemplate(template.id, {
          name: name.trim(),
          thumbnail: thumbnail.trim() || null,
          isPremium,
          isActive,
          sortOrder,
          configuration,
        });
      } else {
        await createTemplate({
          cardTypeId,
          name: name.trim(),
          slug: slug.trim(),
          thumbnail: thumbnail.trim() || null,
          isPremium,
          isActive,
          sortOrder,
          configuration,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <form className={styles.modalContent} onSubmit={handleSubmit}>
        <div className={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{isEdit ? 'Edit Template' : 'New Template'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>}

        {!isEdit && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="template-card-type">
              Card Type
            </label>
            <select
              id="template-card-type"
              className={styles.input}
              value={cardTypeId}
              onChange={(e) => setCardTypeId(e.target.value)}
            >
              {cardTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name} ({ct.slug})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="template-name">
            Name
          </label>
          <input
            id="template-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Modern"
            required
          />
        </div>

        {!isEdit && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="template-slug">
              Slug (registry key — e.g. business-modern)
            </label>
            <input
              id="template-slug"
              className={styles.input}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="business-modern"
              required
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="template-thumbnail">
            Thumbnail URL (optional)
          </label>
          <input
            id="template-thumbnail"
            className={styles.input}
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://…/preview.png"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="template-description">
            Description / preview text
          </label>
          <textarea
            id="template-description"
            className={styles.input}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {isEdit && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="template-sort-order">
              Sort order
            </label>
            <input
              id="template-sort-order"
              type="number"
              min={0}
              className={styles.input}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        )}

        <div className={styles.checkRow}>
          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />{' '}
            Active
          </label>
          <label>
            <input
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
            />{' '}
            Premium
          </label>
        </div>

        <div className={styles.actions} style={{ marginTop: 20 }}>
          <button type="button" className={styles.secondaryBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.primaryBtn} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </form>
    </div>
  );
}
