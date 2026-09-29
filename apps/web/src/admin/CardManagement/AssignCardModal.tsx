'use client';

import React, { useState } from 'react';
import type { CardInventoryItem } from '@nfc-card/shared';
import { assignCard, searchUsers, type SearchUserItem } from '@/src/shared/api/cards';
import styles from './CardManagement.module.css';

interface AssignCardModalProps {
  card: CardInventoryItem;
  onClose: () => void;
  onSuccess: (updatedCard: any) => void;
}

export function AssignCardModal({ card, onClose, onSuccess }: AssignCardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUserItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await searchUsers(searchQuery.trim());
      setUsers(results);
      if (results.length === 0) {
        setError('No users found matching that name, phone, or email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to search users.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await assignCard(card.id, selectedUser.id);
      onSuccess(res.card);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent} style={{ maxWidth: 560 }}>
        <div className={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            Assign Card: <span style={{ fontFamily: 'monospace' }}>{card.cardNumber}</span>
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

        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
          Card Type: <strong>{card.cardType.name}</strong> ({card.cardType.slug}). Search for an
          existing customer to assign this available NFC card.
        </p>

        {error && (
          <div
            className={`${styles.statusBanner} ${styles.errorBanner}`}
            style={{ marginBottom: 16 }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by customer name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSubmitting || isSearching}
          />
          <button
            type="submit"
            className={styles.secondaryBtn}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {users.length > 0 && (
          <div
            style={{
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            {users.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
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
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {u.phone} {u.email ? `• ${u.email}` : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 14 }}>
                      ✓ Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedUser && (
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <strong>Target Customer:</strong> {selectedUser.name} ({selectedUser.phone})
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
            disabled={!selectedUser || isSubmitting}
            onClick={handleAssign}
          >
            {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
