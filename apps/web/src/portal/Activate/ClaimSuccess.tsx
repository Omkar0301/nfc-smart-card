'use client';

import Link from 'next/link';
import type { ClaimCardResponse } from '@nfc-card/shared';
import styles from './Activate.module.css';

interface ClaimSuccessProps {
  token: string;
  result: ClaimCardResponse;
  cardTypeName?: string;
}

export function ClaimSuccess({ token, result, cardTypeName }: ClaimSuccessProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.iconCircle} ${styles.iconCircleSuccess}`}>🎉</div>
        <h1 className={styles.title}>Card Claimed!</h1>
        <p className={styles.subtitle}>
          Your NFC smart card has been successfully activated and linked to your account.
        </p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Card Number</span>
          <span className={styles.infoValue}>{result.card.cardNumber}</span>
        </div>
        {cardTypeName && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Card Type</span>
            <span className={styles.infoValue}>{cardTypeName}</span>
          </div>
        )}
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Status</span>
          <span className={`${styles.statusBadge} ${styles.badgeAssigned}`}>
            {result.card.status}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Profile Status</span>
          <span className={styles.infoValue}>Draft initialized</span>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/portal/profile" className={styles.button}>
          Set Up Your Profile →
        </Link>
        <Link href="/portal/dashboard" className={styles.secondaryButton}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
