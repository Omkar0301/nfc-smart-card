'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CardStatus, type CardDetail as CardDetailType } from '@nfc-card/shared';
import { activateCard, getCardDetail, unsuspendCard } from '@/src/shared/api/cards';
import { AssignCardModal } from './AssignCardModal';
import { SuspendModal } from './SuspendModal';
import { DeactivateModal } from './DeactivateModal';
import { ReplaceCardModal } from './ReplaceCardModal';
import styles from './CardManagement.module.css';

interface CardDetailProps {
  cardId: string;
  onBack: () => void;
  onCardUpdated?: () => void;
}

export function CardDetail({ cardId, onBack, onCardUpdated }: CardDetailProps) {
  const [card, setCard] = useState<CardDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState<
    'assign' | 'suspend' | 'deactivate' | 'replace' | null
  >(null);

  const fetchCard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCardDetail(cardId);
      setCard(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load card details.');
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const handleCopyLink = () => {
    if (!card) return;
    const url =
      (card as any).nfcUrl ||
      `${window.location.origin}/p/${card.cardType.slug}/${card.publicToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleActivate = async () => {
    if (!card) return;
    setError(null);
    try {
      const res = await activateCard(card.id);
      setActionSuccessMessage(res.message);
      await fetchCard();
      if (onCardUpdated) onCardUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate card.');
    }
  };

  const handleUnsuspend = async () => {
    if (!card) return;
    setError(null);
    try {
      const res = await unsuspendCard(card.id);
      setActionSuccessMessage(res.message);
      await fetchCard();
      if (onCardUpdated) onCardUpdated();
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

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
        Loading card details...
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className={styles.detailContainer}>
        <div className={`${styles.statusBanner} ${styles.errorBanner}`}>{error}</div>
        <div>
          <button type="button" className={styles.secondaryBtn} onClick={onBack}>
            ← Back to Card Inventory
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const activeAssignment =
    card.assignments.find((a) => a.status === 'ACTIVE') || card.assignments[0];
  const canAssign = card.status === CardStatus.AVAILABLE;
  const canActivate = card.status === CardStatus.ASSIGNED;
  const canSuspend =
    card.status === CardStatus.ACTIVE ||
    card.status === CardStatus.ASSIGNED ||
    card.status === CardStatus.PAUSED;
  const canUnsuspend = card.status === CardStatus.SUSPENDED;
  const canReplace =
    (card.status === CardStatus.ACTIVE ||
      card.status === CardStatus.ASSIGNED ||
      card.status === CardStatus.PAUSED ||
      card.status === CardStatus.SUSPENDED) &&
    Boolean(activeAssignment);
  const canDeactivate = card.status !== CardStatus.DEACTIVATED;

  return (
    <div className={styles.detailContainer}>
      {/* Top Bar with Navigation & Actions */}
      <div className={styles.detailTopBar}>
        <div>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onBack}
            style={{ marginBottom: 8 }}
          >
            ← Back to Inventory
          </button>
          <div className={styles.detailCardHeader}>
            <h2 className={styles.detailTitle}>{card.cardNumber}</h2>
            {getStatusBadge(card.status)}
            <span
              style={{
                fontSize: 12,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              {card.cardType.name}
            </span>
          </div>
        </div>

        <div className={styles.actionsGroup}>
          <button type="button" className={styles.secondaryBtn} onClick={handleCopyLink}>
            {copiedLink ? '✓ Copied Link!' : '🔗 Copy NFC URL'}
          </button>

          {canAssign && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setModalType('assign')}
            >
              👤 Assign to Customer
            </button>
          )}

          {canActivate && (
            <button type="button" className={styles.primaryBtn} onClick={handleActivate}>
              ⚡ Activate Card
            </button>
          )}

          {canUnsuspend && (
            <button type="button" className={styles.primaryBtn} onClick={handleUnsuspend}>
              ✓ Unsuspend
            </button>
          )}

          {canSuspend && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setModalType('suspend')}
            >
              ⏸️ Suspend
            </button>
          )}

          {canReplace && (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setModalType('replace')}
            >
              🔄 Replace Card
            </button>
          )}

          {canDeactivate && (
            <button
              type="button"
              className={styles.actionBtnSmDanger}
              style={{ padding: '8px 12px', fontSize: 13, borderRadius: 6 }}
              onClick={() => setModalType('deactivate')}
            >
              🚫 Deactivate
            </button>
          )}
        </div>
      </div>

      {actionSuccessMessage && (
        <div className={`${styles.statusBanner} ${styles.successBanner}`}>
          {actionSuccessMessage}
        </div>
      )}

      {error && <div className={`${styles.statusBanner} ${styles.errorBanner}`}>{error}</div>}

      {/* Grid panels */}
      <div className={styles.detailGrid}>
        {/* Card Specs */}
        <div className={styles.detailPanel}>
          <h4 className={styles.detailPanelTitle}>Hardware & NFC Token</h4>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Card ID</span>
            <span className={styles.propValue} style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {card.id}
            </span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Card Number</span>
            <span className={styles.propValue}>{card.cardNumber}</span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Public NFC Token</span>
            <span className={styles.tokenText}>{card.publicToken}</span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Card Type</span>
            <span className={styles.propValue}>
              {card.cardType.name} ({card.cardType.slug})
            </span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Batch ID</span>
            <span className={styles.propValue} style={{ fontSize: 11, fontFamily: 'monospace' }}>
              {card.batchId || 'Single Issue'}
            </span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Created</span>
            <span className={styles.propValue}>{new Date(card.createdAt).toLocaleString()}</span>
          </div>
          <div className={styles.propRow}>
            <span className={styles.propLabel}>Last Updated</span>
            <span className={styles.propValue}>{new Date(card.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Current Owner */}
        <div className={styles.detailPanel}>
          <h4 className={styles.detailPanelTitle}>Current Assignment & Customer</h4>
          {activeAssignment?.user ? (
            <div>
              <div className={styles.propRow}>
                <span className={styles.propLabel}>Customer Name</span>
                <span className={styles.propValue}>{activeAssignment.user.name}</span>
              </div>
              <div className={styles.propRow}>
                <span className={styles.propLabel}>Phone</span>
                <span className={styles.propValue}>{activeAssignment.user.phone}</span>
              </div>
              <div className={styles.propRow}>
                <span className={styles.propLabel}>Email</span>
                <span className={styles.propValue}>
                  {activeAssignment.user.email || 'None set'}
                </span>
              </div>
              <div className={styles.propRow}>
                <span className={styles.propLabel}>Assignment Status</span>
                <span className={styles.propValue}>
                  <strong
                    style={{ color: activeAssignment.status === 'ACTIVE' ? '#166534' : '#64748b' }}
                  >
                    {activeAssignment.status}
                  </strong>
                </span>
              </div>
              <div className={styles.propRow}>
                <span className={styles.propLabel}>Assigned Date</span>
                <span className={styles.propValue}>
                  {new Date(activeAssignment.assignedAt).toLocaleString()}
                </span>
              </div>
              {activeAssignment.unassignedAt && (
                <div className={styles.propRow}>
                  <span className={styles.propLabel}>Unassigned Date</span>
                  <span className={styles.propValue}>
                    {new Date(activeAssignment.unassignedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              This card is currently <strong>AVAILABLE</strong> in inventory and has not been
              claimed or assigned to any customer yet.
            </div>
          )}
        </div>
      </div>

      {/* Assignment History & Profile Events */}
      <div className={styles.detailGrid}>
        {/* Assignment History Timeline */}
        <div className={styles.detailPanel}>
          <h4 className={styles.detailPanelTitle}>
            Assignment History ({card.assignments.length})
          </h4>
          {card.assignments.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No assignment history recorded.</p>
          ) : (
            <div>
              {card.assignments.map((assignment) => (
                <div key={assignment.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineHeader}>
                    {assignment.user.name} ({assignment.user.phone})
                  </div>
                  <div className={styles.timelineSub}>
                    Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                    {assignment.unassignedAt
                      ? ` • Ended: ${new Date(assignment.unassignedAt).toLocaleDateString()}`
                      : ' • Present'}{' '}
                    (Status: <strong>{assignment.status}</strong>)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Events Telemetry */}
        <div className={styles.detailPanel}>
          <h4 className={styles.detailPanelTitle}>Recent Profile Events ({card.events.length})</h4>
          {card.events.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              No interaction events logged yet for this card chip.
            </p>
          ) : (
            <div>
              {card.events.map((evt) => (
                <div key={evt.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ background: '#10b981' }} />
                  <div className={styles.timelineHeader}>
                    <code>{evt.eventType}</code>
                  </div>
                  <div className={styles.timelineSub}>
                    {new Date(evt.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalType === 'assign' && (
        <AssignCardModal
          card={card as any}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setActionSuccessMessage('Card successfully assigned.');
            fetchCard();
            if (onCardUpdated) onCardUpdated();
          }}
        />
      )}

      {modalType === 'suspend' && (
        <SuspendModal
          card={card as any}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setActionSuccessMessage('Card successfully suspended.');
            fetchCard();
            if (onCardUpdated) onCardUpdated();
          }}
        />
      )}

      {modalType === 'deactivate' && (
        <DeactivateModal
          card={card as any}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setActionSuccessMessage('Card permanently deactivated.');
            fetchCard();
            if (onCardUpdated) onCardUpdated();
          }}
        />
      )}

      {modalType === 'replace' && (
        <ReplaceCardModal
          card={card as any}
          onClose={() => setModalType(null)}
          onSuccess={(res) => {
            setActionSuccessMessage(res.message);
            fetchCard();
            if (onCardUpdated) onCardUpdated();
          }}
        />
      )}
    </div>
  );
}
