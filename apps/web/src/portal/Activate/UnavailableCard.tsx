'use client';

import Link from 'next/link';
import { CardStatus } from '@nfc-card/shared';
import styles from './Activate.module.css';

interface UnavailableCardProps {
  status: CardStatus | string;
}

export function UnavailableCard({ status }: UnavailableCardProps) {
  let title = 'Card Unavailable';
  let message = 'This card cannot be accessed or claimed at this time.';
  let badgeClass = styles.badgePaused;
  let icon = '⏸️';

  if (status === CardStatus.PAUSED) {
    title = 'Card Paused';
    message = 'This card is currently paused by its owner.';
    badgeClass = styles.badgePaused;
    icon = '⏸️';
  } else if (status === CardStatus.SUSPENDED) {
    title = 'Card Suspended';
    message = 'This card is temporarily unavailable.';
    badgeClass = styles.badgeSuspended;
    icon = '⚠️';
  } else if (status === CardStatus.DEACTIVATED) {
    title = 'Card Deactivated';
    message = 'This card is no longer active and has been retired.';
    badgeClass = styles.badgeDeactivated;
    icon = '🛑';
  } else if (status === CardStatus.ASSIGNED) {
    title = 'Profile Coming Soon';
    message = 'This card has been claimed, but its public profile has not been published yet.';
    badgeClass = styles.badgeAssigned;
    icon = '⏳';
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.iconCircle} ${styles.iconCircleUnavailable}`}>{icon}</div>
        <div style={{ marginBottom: 12 }}>
          <span className={`${styles.statusBadge} ${badgeClass}`}>{status}</span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{message}</p>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/portal/dashboard" className={styles.button}>
          Go to Customer Portal
        </Link>
        <Link href="/portal/login" className={styles.secondaryButton}>
          Sign in with Another Account
        </Link>
      </div>
    </div>
  );
}
