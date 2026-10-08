'use client';

import { useState } from 'react';
import { CardStatus } from '@nfc-card/shared';
import { pauseCard, resumeCard } from '@/src/shared/api/profile';

interface PauseResumeButtonProps {
  initialStatus: CardStatus;
  onStatusChange?: (newStatus: CardStatus) => void;
}

export function PauseResumeButton({ initialStatus, onStatusChange }: PauseResumeButtonProps) {
  const [status, setStatus] = useState<CardStatus>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggle = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (status === CardStatus.ACTIVE) {
        const res = await pauseCard();
        setStatus(res.card.status);
        onStatusChange?.(res.card.status);
        setSuccessMsg('Your card is now paused. Public page is offline.');
      } else if (status === CardStatus.PAUSED) {
        const res = await resumeCard();
        setStatus(res.card.status);
        onStatusChange?.(res.card.status);
        setSuccessMsg('Your card is resumed! Public page is live.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update card status');
    } finally {
      setLoading(false);
    }
  };

  if (status === CardStatus.SUSPENDED) {
    return (
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: '1.2rem' }}>⛔</span>
          <span style={{ fontWeight: 600, color: '#f87171' }}>Card Suspended</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
          This card has been suspended by the platform administrator. Direct customer lifecycle
          actions are disabled. Please reach out to customer support.
        </p>
      </div>
    );
  }

  if (status === CardStatus.ASSIGNED) {
    return (
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 12,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: '1.2rem' }}>📝</span>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>Card Ready to Publish</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
          Your card profile is currently in draft. Once you publish your profile, your card becomes
          ACTIVE and live for visitors.
        </p>
      </div>
    );
  }

  const isPaused = status === CardStatus.PAUSED;

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isPaused ? '#f59e0b' : '#10b981',
                boxShadow: isPaused ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
              }}
            />
            <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.98rem' }}>
              {isPaused ? 'Card is Currently PAUSED' : 'Card is Currently ACTIVE'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            {isPaused
              ? 'Your public profile is hidden. Visitors tapping your card see a safe unavailable screen.'
              : 'Your public profile is live. Anyone tapping your card or scanning your QR can see your visible details.'}
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          type="button"
          style={{
            minHeight: 44,
            padding: '10px 20px',
            borderRadius: 8,
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: isPaused
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            boxShadow: isPaused
              ? '0 4px 12px rgba(16, 185, 129, 0.3)'
              : '0 4px 12px rgba(245, 158, 11, 0.3)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Processing...' : isPaused ? '▶️ Resume Card' : '⏸️ Pause Card'}
        </button>
      </div>

      {successMsg && (
        <div
          style={{
            fontSize: '0.82rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: '0.82rem',
            color: '#f87171',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
