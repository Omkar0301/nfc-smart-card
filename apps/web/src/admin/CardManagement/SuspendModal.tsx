'use client';

import React, { useState } from 'react';
import type { CardInventoryItem } from '@nfc-card/shared';
import { suspendCard } from '@/src/shared/api/cards';
import styles from './CardManagement.module.css';

interface SuspendModalProps {
  card: CardInventoryItem;
  onClose: () => void;
  onSuccess: (updatedCard: any) => void;
}

export function SuspendModal({ card, onClose, onSuccess }: SuspendModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await suspendCard(card.id, reason.trim() || undefined);
      onSuccess(res.card);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to suspend card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#b91c1c' }}>
            Suspend Card: <span style={{ fontFamily: 'monospace' }}>{card.cardNumber}</span>
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div
          className={`${styles.statusBanner} ${styles.warningBanner}`}
          style={{ marginBottom: 16 }}
        >
          <strong>Admin Investigation Action:</strong> When a card is suspended, its public NFC
          profile page immediately returns &quot;temporarily unavailable&quot;. You can unsuspend it
          at any time.
        </div>

        {error && (
          <div
            className={`${styles.statusBanner} ${styles.errorBanner}`}
            style={{ marginBottom: 16 }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSuspend}>
          <div style={{ marginBottom: 18 }}>
            <label
              htmlFor="suspendReason"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
                color: '#334155',
              }}
            >
              Reason for Suspension (Optional):
            </label>
            <textarea
              id="suspendReason"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              placeholder="e.g. Under investigation for suspicious activity, policy violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className={styles.dangerBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Suspending...' : 'Confirm Suspension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
