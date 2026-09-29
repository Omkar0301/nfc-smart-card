'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CardStatus,
  type ClaimCardResponse,
  type PublicCardLookupResponse,
} from '@nfc-card/shared';
import { getCardByToken } from '../../shared/api/cards';
import { ApiError } from '../../shared/api/client';
import { ClaimCard } from './ClaimCard';
import { UnavailableCard } from './UnavailableCard';
import { ClaimSuccess } from './ClaimSuccess';
import styles from './Activate.module.css';

interface ActivatePageProps {
  token: string;
}

export function ActivatePage({ token }: ActivatePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<PublicCardLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimedResult, setClaimedResult] = useState<ClaimCardResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCard() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCardByToken(token);
        if (!isMounted) return;

        setCardData(data);

        // If card is ACTIVE, redirect to public profile page
        if (data.status === CardStatus.ACTIVE) {
          const typeSlug = data.cardType?.slug ?? 'card';
          router.replace(`/p/${typeSlug}/${token}`);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Could not resolve NFC card token.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (token) {
      loadCard();
    }

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className={styles.container}>
      {loading && (
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>Resolving Card…</h2>
            <p className={styles.subtitle}>Connecting to NFC card platform</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={`${styles.iconCircle} ${styles.iconCircleUnavailable}`}>⚠️</div>
            <h1 className={styles.title}>Card Not Found</h1>
            <p className={styles.subtitle}>{error}</p>
          </div>
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className={styles.button}
              onClick={() => router.push('/portal/dashboard')}
            >
              Go to Portal
            </button>
          </div>
        </div>
      )}

      {!loading && !error && claimedResult && (
        <ClaimSuccess
          token={token}
          result={claimedResult}
          cardTypeName={cardData?.cardType?.name}
        />
      )}

      {!loading && !error && !claimedResult && cardData && (
        <>
          {cardData.status === CardStatus.AVAILABLE && (
            <ClaimCard
              token={token}
              cardType={cardData.cardType}
              onClaimed={(res) => setClaimedResult(res)}
            />
          )}

          {cardData.status === CardStatus.ACTIVE && (
            <div className={styles.card}>
              <div className={styles.header}>
                <div className={`${styles.iconCircle} ${styles.iconCircleActive}`}>🌐</div>
                <h1 className={styles.title}>Redirecting to Profile</h1>
                <p className={styles.subtitle}>
                  This card is active. Redirecting you to its public profile…
                </p>
              </div>
              <div style={{ marginTop: 20 }}>
                <a
                  href={`/p/${cardData.cardType?.slug ?? 'card'}/${token}`}
                  className={styles.button}
                >
                  View Profile Now →
                </a>
              </div>
            </div>
          )}

          {cardData.status !== CardStatus.AVAILABLE && cardData.status !== CardStatus.ACTIVE && (
            <UnavailableCard status={cardData.status} />
          )}
        </>
      )}
    </div>
  );
}
