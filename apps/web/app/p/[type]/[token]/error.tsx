'use client';

import React from 'react';
import styles from '../../../../components/public/StatusViews.module.css';

export default function PublicProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconSuspended}`}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgeSuspended}`}>Display Error</div>
        <h1 className={styles.title}>Unable to Display Profile</h1>
        <p className={styles.description}>
          An unexpected issue occurred while rendering this card profile.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()} className={styles.primaryButton}>
            Try Again
          </button>
        </div>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}
