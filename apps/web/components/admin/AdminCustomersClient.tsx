'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminCustomerItem } from '@nfc-card/shared';
import { getAdminCustomers } from '@/src/shared/api/cards';
import styles from './AdminCustomers.module.css';

export function AdminCustomersClient() {
  const [customers, setCustomers] = useState<AdminCustomerItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminCustomers(search.trim() ? search.trim() : undefined);
        setCustomers(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to search customers.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399' };
      case 'PAUSED':
        return { bg: 'rgba(251, 146, 60, 0.15)', text: '#fb923c' };
      case 'SUSPENDED':
        return { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' };
      case 'ASSIGNED':
        return { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Customer Accounts Directory</h1>
          <p className={styles.subtitle}>
            Search registered cardholders, view account statuses, and inspect bound NFC cards.
          </p>
        </div>

        <div className={styles.searchBar}>
          <span>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, phone, or recovery email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: 8,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className={styles.tableCard}>
        {loading && customers.length === 0 ? (
          <div className={styles.emptyState}>
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px auto',
              }}
            />
            Searching customer accounts...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.emptyState}>
            <p
              style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}
            >
              No customers found
            </p>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
              Try searching with a different name, phone number, or email address.
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Customer</th>
                <th className={styles.th}>Contact Info</th>
                <th className={styles.th}>Role / Status</th>
                <th className={styles.th}>Assigned NFC Cards</th>
                <th className={styles.th}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.customerName}>
                      <div className={styles.customerAvatar}>
                        {(c.name || c.phone || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{c.name || 'Unnamed Cardholder'}</div>
                        <div
                          style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}
                        >
                          ID: {c.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className={styles.td}>
                    <div style={{ fontWeight: 500, color: '#f1f5f9' }}>{c.phone}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {c.email ? c.email : 'No recovery email'}
                    </div>
                  </td>

                  <td className={styles.td}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span
                        className={styles.statusPill}
                        style={{
                          background:
                            c.role === 'ADMIN'
                              ? 'rgba(124, 58, 237, 0.2)'
                              : 'rgba(59, 130, 246, 0.15)',
                          color: c.role === 'ADMIN' ? '#c4b5fd' : '#93c5fd',
                        }}
                      >
                        {c.role}
                      </span>
                      <span
                        className={styles.statusPill}
                        style={{
                          background:
                            c.status === 'ACTIVE'
                              ? 'rgba(52, 211, 153, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color: c.status === 'ACTIVE' ? '#34d399' : '#f87171',
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                  </td>

                  <td className={styles.td}>
                    {c.assignments && c.assignments.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {c.assignments.map((as) => {
                          const statusStyle = getStatusColor(as.card.status);
                          return (
                            <Link
                              key={as.id}
                              href={`/admin/cards/${as.card.id}`}
                              className={styles.cardBadge}
                            >
                              <span>💳</span>
                              <span style={{ fontWeight: 600 }}>{as.card.cardNumber}</span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                ({as.card.cardType.name})
                              </span>
                              <span
                                className={styles.statusPill}
                                style={{
                                  background: statusStyle.bg,
                                  color: statusStyle.text,
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                }}
                              >
                                {as.card.status}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        No cards assigned
                      </span>
                    )}
                  </td>

                  <td className={styles.td} style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
