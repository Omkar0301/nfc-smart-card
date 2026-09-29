'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CardStatus, type CardInventoryItem, type CardType } from '@nfc-card/shared';
import { activateCard, listCards, unsuspendCard } from '@/src/shared/api/cards';
import { listCardTypes } from '@/src/shared/api/cardTypes';
import { AssignCardModal } from './AssignCardModal';
import { SuspendModal } from './SuspendModal';
import { DeactivateModal } from './DeactivateModal';
import { ReplaceCardModal } from './ReplaceCardModal';
import styles from './CardManagement.module.css';

interface CardListProps {
  onSelectCard: (cardId: string) => void;
}

export function CardList({ onSelectCard }: CardListProps) {
  const [cards, setCards] = useState<CardInventoryItem[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCardTypeId, setSelectedCardTypeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal actions
  const [targetCard, setTargetCard] = useState<CardInventoryItem | null>(null);
  const [activeModal, setActiveModal] = useState<
    'assign' | 'suspend' | 'deactivate' | 'replace' | null
  >(null);

  const fetchCardTypes = useCallback(async () => {
    try {
      const types = await listCardTypes();
      setCardTypes(types);
    } catch {
      // non-critical if card types cannot be fetched immediately
    }
  }, []);

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCards({
        cardTypeId: selectedCardTypeId || undefined,
        status: selectedStatus || undefined,
        search: search.trim() || undefined,
        page,
        limit,
      });
      setCards(res.cards);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load card inventory.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCardTypeId, selectedStatus, search, page, limit]);

  useEffect(() => {
    fetchCardTypes();
  }, [fetchCardTypes]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCards();
  };

  const handleQuickActivate = async (card: CardInventoryItem) => {
    try {
      const res = await activateCard(card.id);
      setSuccessMessage(res.message);
      fetchCards();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate card.');
    }
  };

  const handleQuickUnsuspend = async (card: CardInventoryItem) => {
    try {
      const res = await unsuspendCard(card.id);
      setSuccessMessage(res.message);
      fetchCards();
    } catch (err: any) {
      setError(err?.message || 'Failed to unsuspend card.');
    }
  };

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case CardStatus.AVAILABLE:
        return <span className={styles.badgeAvailable}>Available</span>;
      case CardStatus.ASSIGNED:
        return <span className={styles.badgeAssigned}>Assigned</span>;
      case CardStatus.ACTIVE:
        return <span className={styles.badgeActive}>Active</span>;
      case CardStatus.PAUSED:
        return <span className={styles.badgePaused}>Paused</span>;
      case CardStatus.SUSPENDED:
        return <span className={styles.badgeSuspended}>Suspended</span>;
      case CardStatus.DEACTIVATED:
        return <span className={styles.badgeDeactivated}>Deactivated</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className={styles.filterRow}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: 8 }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by card number (e.g. BC-000001), token, customer name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className={styles.secondaryBtn}>
            🔍 Search
          </button>
        </form>

        <select
          className={styles.filterSelect}
          value={selectedCardTypeId}
          aria-label="Filter by Card Type"
          onChange={(e) => {
            setSelectedCardTypeId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Card Types</option>
          {cardTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.slug})
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={selectedStatus}
          aria-label="Filter by Lifecycle Status"
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Lifecycle Statuses</option>
          <option value={CardStatus.AVAILABLE}>AVAILABLE</option>
          <option value={CardStatus.ASSIGNED}>ASSIGNED</option>
          <option value={CardStatus.ACTIVE}>ACTIVE</option>
          <option value={CardStatus.PAUSED}>PAUSED</option>
          <option value={CardStatus.SUSPENDED}>SUSPENDED</option>
          <option value={CardStatus.DEACTIVATED}>DEACTIVATED</option>
        </select>

        {(search || selectedCardTypeId || selectedStatus) && (
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              setSearch('');
              setSelectedCardTypeId('');
              setSelectedStatus('');
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {successMessage && (
        <div
          className={`${styles.statusBanner} ${styles.successBanner}`}
          style={{ marginBottom: 16 }}
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          className={`${styles.statusBanner} ${styles.errorBanner}`}
          style={{ marginBottom: 16 }}
        >
          {error}
        </div>
      )}

      {/* Cards Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>Card Number</th>
              <th>Token</th>
              <th>Card Type</th>
              <th>Status</th>
              <th>Assigned Customer</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading card inventory...
                </td>
              </tr>
            ) : cards.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No NFC cards found matching the criteria.
                </td>
              </tr>
            ) : (
              cards.map((c) => {
                const activeUser = c.activeAssignment?.user || c.assignments?.[0]?.user;
                const canAssign = c.status === CardStatus.AVAILABLE;
                const canActivate = c.status === CardStatus.ASSIGNED;
                const canSuspend =
                  c.status === CardStatus.ACTIVE ||
                  c.status === CardStatus.ASSIGNED ||
                  c.status === CardStatus.PAUSED;
                const canUnsuspend = c.status === CardStatus.SUSPENDED;
                const canReplace =
                  (c.status === CardStatus.ACTIVE ||
                    c.status === CardStatus.ASSIGNED ||
                    c.status === CardStatus.PAUSED ||
                    c.status === CardStatus.SUSPENDED) &&
                  Boolean(activeUser);
                const canDeactivate = c.status !== CardStatus.DEACTIVATED;

                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.cardNumberBadge}>{c.cardNumber}</span>
                    </td>
                    <td>
                      <span className={styles.tokenText}>{c.publicToken.slice(0, 10)}...</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.cardType.name}</span>
                    </td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td>
                      {activeUser ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{activeUser.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{activeUser.phone}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsGroup} style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className={styles.actionBtnSm}
                          onClick={() => onSelectCard(c.id)}
                          title="View Card Details & Full History"
                        >
                          Details →
                        </button>

                        {canAssign && (
                          <button
                            type="button"
                            className={`${styles.actionBtnSm} ${styles.actionBtnSmPrimary}`}
                            onClick={() => {
                              setTargetCard(c);
                              setActiveModal('assign');
                            }}
                          >
                            Assign
                          </button>
                        )}

                        {canActivate && (
                          <button
                            type="button"
                            className={`${styles.actionBtnSm} ${styles.actionBtnSmPrimary}`}
                            onClick={() => handleQuickActivate(c)}
                          >
                            Activate
                          </button>
                        )}

                        {canUnsuspend && (
                          <button
                            type="button"
                            className={`${styles.actionBtnSm} ${styles.actionBtnSmPrimary}`}
                            onClick={() => handleQuickUnsuspend(c)}
                          >
                            Unsuspend
                          </button>
                        )}

                        {canSuspend && (
                          <button
                            type="button"
                            className={styles.actionBtnSm}
                            onClick={() => {
                              setTargetCard(c);
                              setActiveModal('suspend');
                            }}
                          >
                            Suspend
                          </button>
                        )}

                        {canReplace && (
                          <button
                            type="button"
                            className={styles.actionBtnSm}
                            onClick={() => {
                              setTargetCard(c);
                              setActiveModal('replace');
                            }}
                          >
                            Replace
                          </button>
                        )}

                        {canDeactivate && (
                          <button
                            type="button"
                            className={`${styles.actionBtnSm} ${styles.actionBtnSmDanger}`}
                            onClick={() => {
                              setTargetCard(c);
                              setActiveModal('deactivate');
                            }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className={styles.pagination}>
        <div>
          Showing <strong>{cards.length}</strong> of <strong>{total}</strong> cards (Page{' '}
          <strong>{page}</strong> of <strong>{totalPages}</strong>)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'assign' && targetCard && (
        <AssignCardModal
          card={targetCard}
          onClose={() => {
            setActiveModal(null);
            setTargetCard(null);
          }}
          onSuccess={() => {
            setSuccessMessage(`Card ${targetCard.cardNumber} assigned successfully.`);
            fetchCards();
          }}
        />
      )}

      {activeModal === 'suspend' && targetCard && (
        <SuspendModal
          card={targetCard}
          onClose={() => {
            setActiveModal(null);
            setTargetCard(null);
          }}
          onSuccess={() => {
            setSuccessMessage(`Card ${targetCard.cardNumber} suspended successfully.`);
            fetchCards();
          }}
        />
      )}

      {activeModal === 'deactivate' && targetCard && (
        <DeactivateModal
          card={targetCard}
          onClose={() => {
            setActiveModal(null);
            setTargetCard(null);
          }}
          onSuccess={() => {
            setSuccessMessage(`Card ${targetCard.cardNumber} permanently deactivated.`);
            fetchCards();
          }}
        />
      )}

      {activeModal === 'replace' && targetCard && (
        <ReplaceCardModal
          card={targetCard}
          onClose={() => {
            setActiveModal(null);
            setTargetCard(null);
          }}
          onSuccess={(res) => {
            setSuccessMessage(res.message);
            fetchCards();
          }}
        />
      )}
    </div>
  );
}
