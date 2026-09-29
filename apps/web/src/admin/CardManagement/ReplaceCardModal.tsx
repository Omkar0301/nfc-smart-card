'use client';

import React, { useEffect, useState } from 'react';
import type { CardInventoryItem } from '@nfc-card/shared';
import {
  getAvailableReplacements,
  replaceCard,
  type AvailableReplacementCard,
} from '@/src/shared/api/cards';
import styles from './CardManagement.module.css';

interface ReplaceCardModalProps {
  card: CardInventoryItem;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export function ReplaceCardModal({ card, onClose, onSuccess }: ReplaceCardModalProps) {
  const [replacements, setReplacements] = useState<AvailableReplacementCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<AvailableReplacementCard | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUser = card.activeAssignment?.user || card.assignments?.[0]?.user;

  useEffect(() => {
    let isMounted = true;
    async function fetchReplacements() {
      setIsLoading(true);
      setError(null);
      try {
        const cards = await getAvailableReplacements(
          card.cardType.id,
          card.id,
          searchFilter.trim() || undefined
        );
        if (isMounted) {
          setReplacements(cards);
          if (cards.length === 0) {
            setError(
              `No AVAILABLE replacement cards found for type '${card.cardType.name}'. Please generate more cards first.`
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load replacement cards.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchReplacements();
    return () => {
      isMounted = false;
    };
  }, [card.cardType.id, card.cardType.name, card.id, searchFilter]);

  const handleReplace = async () => {
    if (!selectedCard) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await replaceCard(card.id, selectedCard.id);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to execute card replacement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent} style={{ maxWidth: 620 }}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Replace Card: <span style={{ fontFamily: 'monospace' }}>{card.cardNumber}</span>
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

        <div className={`${styles.statusBanner} ${styles.infoBanner}`} style={{ marginBottom: 16 }}>
          <strong>Seamless Replacement Flow (§17):</strong> The old card{' '}
          <code>{card.cardNumber}</code> will be permanently deactivated. The replacement card will
          be assigned to <strong>{activeUser?.name || activeUser?.phone || 'Customer'}</strong>. All
          profile fields, templates, and analytics history are preserved.
        </div>

        {error && (
          <div
            className={`${styles.statusBanner} ${styles.errorBanner}`}
            style={{ marginBottom: 16 }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="replacementSearch"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: '#334155',
            }}
          >
            Select AVAILABLE Replacement Card ({card.cardType.name}):
          </label>
          <input
            id="replacementSearch"
            type="text"
            className={styles.searchInput}
            placeholder="Filter available card numbers..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10 }}
          />

          {isLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Loading available inventory...
            </div>
          ) : replacements.length > 0 ? (
            <div
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
              }}
            >
              {replacements.map((rc) => {
                const isSelected = selectedCard?.id === rc.id;
                return (
                  <div
                    key={rc.id}
                    onClick={() => setSelectedCard(rc)}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: 14,
                          color: '#0f172a',
                        }}
                      >
                        {rc.cardNumber}
                      </span>
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 11,
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        Token: {rc.publicToken.slice(0, 8)}...
                      </span>
                    </div>
                    {isSelected && (
                      <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
                        ✓ Selected Replacement
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No available replacement cards match your search.
            </div>
          )}
        </div>

        {selectedCard && (
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div>
              <strong>Target Customer:</strong> {activeUser?.name || 'Customer'} (
              {activeUser?.phone})
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>New Card Number:</strong>{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {selectedCard.cardNumber}
              </span>
            </div>
          </div>
        )}

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
            type="button"
            className={styles.primaryBtn}
            disabled={!selectedCard || isSubmitting}
            onClick={handleReplace}
          >
            {isSubmitting ? 'Replacing Card...' : 'Confirm Atomic Replace'}
          </button>
        </div>
      </div>
    </div>
  );
}
