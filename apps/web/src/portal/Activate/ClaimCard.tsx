'use client';

import { useState } from 'react';
import type { ClaimCardResponse } from '@nfc-card/shared';
import { useAuth } from '../../shared/hooks/useAuth';
import { OtpFlow } from '../../shared/components/OtpFlow';
import { claimCard } from '../../shared/api/cards';
import { ApiError } from '../../shared/api/client';
import styles from './Activate.module.css';

interface ClaimCardProps {
  token: string;
  cardType?: {
    slug: string;
    name: string;
  };
  onClaimed: (result: ClaimCardResponse) => void;
}

export function ClaimCard({ token, cardType, onClaimed }: ClaimCardProps) {
  const { user, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setPending(true);
    setError(null);

    try {
      const result = await claimCard(token);
      onClaimed(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to claim card. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  // If user is not authenticated, show OTP sign-in / verification flow
  if (!user) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={`${styles.iconCircle} ${styles.iconCircleActive}`}>📇</div>
          <h1 className={styles.title}>Activate Your NFC Card</h1>
          <p className={styles.subtitle}>
            You are claiming a <strong>{cardType?.name ?? 'Smart Card'}</strong>. Verify your phone
            number to link this card to your account.
          </p>
        </div>

        <OtpFlow
          title="Sign in to claim"
          onAuthenticated={() => {
            // Once authenticated, the user state will update and reveal the claim button
          }}
        />
      </div>
    );
  }

  // When user is authenticated
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.iconCircle} ${styles.iconCircleActive}`}>📇</div>
        <div style={{ marginBottom: 12 }}>
          <span className={`${styles.statusBadge} ${styles.badgeAvailable}`}>Ready to Claim</span>
        </div>
        <h1 className={styles.title}>Activate Your Card</h1>
        <p className={styles.subtitle}>
          Link this <strong>{cardType?.name ?? 'Smart Card'}</strong> to your account to begin
          building your public profile.
        </p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Card Type</span>
          <span className={styles.infoValue}>{cardType?.name ?? 'Standard Card'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Card Token</span>
          <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {token}
          </span>
        </div>
      </div>

      <div className={styles.userBox}>
        <div className={styles.userText}>
          <span className={styles.userPhone}>{user.phone}</span>
          {user.name && <span className={styles.userName}>{user.name}</span>}
        </div>
        <button
          type="button"
          onClick={() => logout()}
          style={{
            background: 'none',
            border: 'none',
            color: '#15803d',
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Switch Account
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <button type="button" className={styles.button} disabled={pending} onClick={handleClaim}>
        {pending ? 'Activating Card…' : 'Claim & Activate Card'}
      </button>
    </div>
  );
}
