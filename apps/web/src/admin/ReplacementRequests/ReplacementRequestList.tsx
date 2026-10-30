'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  listAdminReplacementRequests,
  updateReplacementRequestStatus,
  type AdminReplacementRequestItem,
} from '@/src/shared/api/cards';
import styles from './ReplacementRequests.module.css';

export function ReplacementRequestList() {
  const [requests, setRequests] = useState<AdminReplacementRequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listAdminReplacementRequests({
        status: statusFilter || undefined,
        page,
        limit,
      });
      setRequests(res.requests);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load replacement requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = async (
    id: string,
    newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ) => {
    try {
      setUpdatingId(id);
      const updated = await updateReplacementRequestStatus(id, newStatus);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update request status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return styles.statusPending;
      case 'IN_PROGRESS':
        return styles.statusInProgress;
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return '';
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Card Replacement Requests</h1>
          <p className={styles.subtitle}>
            Review and triage customer requests for lost, stolen, or damaged NFC cards.
          </p>
        </div>

        <div className={styles.filterBar}>
          <label htmlFor="statusFilter" style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Filter Status:
          </label>
          <select
            id="statusFilter"
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses ({total})</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            padding: 12,
            borderRadius: 8,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Card Number</th>
                <th>Vertical</th>
                <th>Reason & Notes</th>
                <th>Status</th>
                <th>Update Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    Loading replacement requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No replacement requests found matching the criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{req.user.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{req.user.phone}</div>
                      {req.user.email && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {req.user.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/admin/cards/${req.cardId}`}
                        style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {req.card?.cardNumber || 'N/A'}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Status: {req.card?.status}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.78rem',
                        }}
                      >
                        {req.card?.cardType?.name || 'Standard'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#cbd5e1' }}>
                        {req.reason || 'Not specified'}
                      </div>
                      {req.notes && (
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#94a3b8',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={req.notes}
                        >
                          "{req.notes}"
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className={styles.statusDropdown}
                        value={req.status}
                        disabled={updatingId === req.id}
                        onChange={(e) =>
                          handleStatusChange(
                            req.id,
                            e.target.value as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
                          )
                        }
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <Link href={`/admin/cards/${req.cardId}`} className={styles.actionBtn}>
                        <span>🔄</span> Replace Card
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Page {page} of {totalPages} ({total} total requests)
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
