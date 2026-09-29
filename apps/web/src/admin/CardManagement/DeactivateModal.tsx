'use client';

import React, { useState } from 'react';
import type { CardInventoryItem } from '@nfc-card/shared';
import { deactivateCard } from '@/src/shared/api/cards';
import styles from './CardManagement.module.css';

interface DeactivateModalProps {
  card: CardInventoryItem;
  onClose: () => void;
  onSuccess: (updatedCard: any) => void;
}

export function DeactivateModal({ card, onClose, onSuccess }: DeactivateModalProps) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText.trim().toUpperCase() === 'DEACTIVATE';

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await deactivateCard(card.id, reason.trim() || undefined);
      onSuccess(res.card);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to deactivate card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#991b1b' }}>
            Permanent Deactivation:{' '}
            <span style={{ fontFamily: 'monospace' }}>{card.cardNumber}</span>
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
          className={`${styles.statusBanner} ${styles.errorBanner}`}
          style={{ marginBottom: 16 }}
        >
          <strong>⚠️ Irreversible Action:</strong> Deactivating a card is permanent (Rules #16). No
          endpoint or admin action can ever reactivate this card number. Any active card assignment
          will be terminated.
        </div>

        {error && (
          <div
            className={`${styles.statusBanner} ${styles.errorBanner}`}
            style={{ marginBottom: 16 }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleDeactivate}>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="deactivateReason"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
                color: '#334155',
              }}
            >
              Reason for Deactivation:
            </label>
            <textarea
              id="deactivateReason"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              placeholder="e.g. Card lost/stolen, customer abandoned, hardware damaged..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="confirmText"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
                color: '#0f172a',
              }}
            >
              Type <strong>DEACTIVATE</strong> to confirm:
            </label>
            <input
              id="confirmText"
              type="text"
              className={styles.searchInput}
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DEACTIVATE"
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
            <button
              type="submit"
              className={styles.dangerBtn}
              disabled={!isConfirmed || isSubmitting}
            >
              {isSubmitting ? 'Deactivating...' : 'Permanently Deactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
