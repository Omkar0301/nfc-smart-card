'use client';

import type { TemplateProps, TemplateSummary } from '@nfc-card/shared';
import { TemplateRenderer } from '@nfc-card/shared/templates';
import styles from './TemplatePicker.module.css';

export interface TemplatePreviewProps {
  template: TemplateSummary;
  templateProps: TemplateProps;
  isActive: boolean;
  isSaving: boolean;
  onUse: (template: TemplateSummary) => void;
  onClose: () => void;
}

/** Full-screen preview of a template rendered against the customer's real data. */
export function TemplatePreview({
  template,
  templateProps,
  isActive,
  isSaving,
  onUse,
  onClose,
}: TemplatePreviewProps) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${template.name} preview`}
    >
      <div className={styles.overlayHeader}>
        <div>
          <strong>{template.name}</strong> preview
          {isActive ? ' · currently live' : ''}
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      <div className={styles.previewStage}>
        <div className={styles.phoneFrame}>
          <TemplateRenderer slug={template.slug} {...templateProps} />
        </div>
      </div>

      <div className={styles.overlayFooter}>
        <button type="button" className={styles.secondaryBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={isActive || isSaving}
          onClick={() => onUse(template)}
        >
          {isActive ? 'Current template' : isSaving ? 'Applying…' : 'Use this template'}
        </button>
      </div>
    </div>
  );
}
