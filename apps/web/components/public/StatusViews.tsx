import React from 'react';
import Link from 'next/link';
import styles from './StatusViews.module.css';

interface BaseStatusViewProps {
  title?: string;
  description?: string;
}

export function NotFoundView({
  title = 'Card Not Found',
  description = 'The link you followed may be invalid, expired, or the card does not exist.',
}: BaseStatusViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconNotFound}`}>
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
        <div className={`${styles.badge} ${styles.badgeNotFound}`}>404 Not Found</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.secondaryButton}>
            Return Home
          </Link>
        </div>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}

export interface AvailableViewProps {
  token: string;
  cardTypeName?: string;
}

export function AvailableView({ token, cardTypeName }: AvailableViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconAvailable}`}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgeAvailable}`}>
          {cardTypeName ? `${cardTypeName} · Unactivated` : 'Unactivated Card'}
        </div>
        <h1 className={styles.title}>Card Not Activated</h1>
        <p className={styles.description}>
          This digital card hasn&apos;t been set up yet. If you are the owner of this card, tap
          below to claim and activate your profile.
        </p>
        <div className={styles.actions}>
          <Link href={`/activate/${token}`} className={styles.primaryButton}>
            Activate This Card &rarr;
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Learn More
          </Link>
        </div>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}

export function DraftView({
  title = 'Profile Coming Soon',
  description = 'The owner of this card is currently setting up their profile. Please check back shortly.',
}: BaseStatusViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconDraft}`}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgeDraft}`}>In Progress</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}

export function PausedView({
  title = 'Card Currently Unavailable',
  description = 'This card has been temporarily paused by its owner.',
}: BaseStatusViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconPaused}`}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="10" y1="15" x2="10" y2="9" />
            <line x1="14" y1="15" x2="14" y2="9" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgePaused}`}>Card Paused</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}

export function SuspendedView({
  title = 'Card Temporarily Unavailable',
  description = 'This card is temporarily unavailable.',
}: BaseStatusViewProps) {
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
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgeSuspended}`}>Unavailable</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}

export function DeactivatedView({
  title = 'Card No Longer Active',
  description = 'This card has been deactivated and is no longer in service.',
}: BaseStatusViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={`${styles.iconWrapper} ${styles.iconDeactivated}`}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div className={`${styles.badge} ${styles.badgeDeactivated}`}>Deactivated</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <footer className={styles.footer}>NFC Digital Card Platform</footer>
    </div>
  );
}
