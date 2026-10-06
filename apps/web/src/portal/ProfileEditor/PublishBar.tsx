import React from 'react';
import Link from 'next/link';
import type { ProfileStatus } from '@nfc-card/shared';
import styles from './ProfileEditor.module.css';

interface PublishBarProps {
  status: ProfileStatus;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  publicToken: string;
  cardTypeSlug: string;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  canPublish: boolean;
}

export function PublishBar({
  status,
  isDirty,
  isSaving,
  isPublishing,
  publicToken,
  cardTypeSlug,
  onSave,
  onPublish,
  onUnpublish,
  canPublish,
}: PublishBarProps) {
  const isPublished = status === 'published';

  return (
    <div className={styles.publishBarWrapper}>
      <div className={styles.publishBarContent}>
        <div className={styles.statusGroup}>
          <span
            className={`${styles.statusBadge} ${
              isPublished ? styles.statusPublished : styles.statusDraft
            }`}
          >
            {isPublished ? '● Published' : '○ Draft'}
          </span>
          {isDirty && <span className={styles.dirtyNotice}>Unsaved changes</span>}
        </div>

        <div className={styles.actionsGroup}>
          {isPublished && publicToken && (
            <Link
              href={`/p/${cardTypeSlug}/${publicToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.previewBtn}
            >
              View Live Profile ↗
            </Link>
          )}

          <button
            type="button"
            className={styles.saveBtn}
            onClick={onSave}
            disabled={!isDirty || isSaving || isPublishing}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          {isPublished ? (
            <button
              type="button"
              className={styles.unpublishBtn}
              onClick={onUnpublish}
              disabled={isSaving || isPublishing}
            >
              {isPublishing ? 'Unpublishing...' : 'Unpublish Profile'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.publishBtn}
              onClick={onPublish}
              disabled={!canPublish || isSaving || isPublishing}
              title={
                !canPublish
                  ? 'Please fill in all required fields before publishing'
                  : 'Publish profile to physical card'
              }
            >
              {isPublishing ? 'Publishing...' : 'Publish Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
