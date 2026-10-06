import React from 'react';
import styles from './ProfileEditor.module.css';

interface VisibilitySummaryProps {
  totalFields: number;
  visibleCount: number;
  hiddenCount: number;
}

export function VisibilitySummary({
  totalFields,
  visibleCount,
  hiddenCount,
}: VisibilitySummaryProps) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryCounts}>
        <div className={styles.countItem}>
          <span className={`${styles.countNumber} ${styles.visibleCount}`}>👁️ {visibleCount}</span>
          <span>Public fields</span>
        </div>
        <div className={styles.countItem}>
          <span className={`${styles.countNumber} ${styles.hiddenCount}`}>🔒 {hiddenCount}</span>
          <span>Hidden fields</span>
        </div>
      </div>
      <div className={styles.summaryTip}>
        ℹ️ Use the toggle on each field to control what card-tappers can see.
      </div>
    </div>
  );
}
