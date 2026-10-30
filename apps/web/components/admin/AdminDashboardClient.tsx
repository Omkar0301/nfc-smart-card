'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminDashboardMetrics, CardType } from '@nfc-card/shared';
import { getAdminDashboardMetrics } from '@/src/shared/api/cards';
import { listCardTypes } from '@/src/shared/api/cardTypes';
import styles from './AdminDashboard.module.css';

export function AdminDashboardClient() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [selectedCardType, setSelectedCardType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCardTypes() {
      try {
        const types = await listCardTypes();
        setCardTypes(types);
      } catch (err) {
        console.error('Failed to load card types:', err);
      }
    }
    loadCardTypes();
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminDashboardMetrics(
          selectedCardType ? selectedCardType : undefined
        );
        setMetrics(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load platform metrics.');
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [selectedCardType]);

  const cards = metrics?.cards || {
    total: 0,
    available: 0,
    assigned: 0,
    active: 0,
    paused: 0,
    suspended: 0,
    deactivated: 0,
  };

  return (
    <div className={styles.container}>
      {/* Top Header & Filter */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Operations Control Center</h1>
          <p className={styles.subtitle}>
            Platform inventory health, user engagement, and card lifecycle metrics.
          </p>
        </div>

        <div className={styles.filterBar}>
          <label htmlFor="cardTypeFilter" className={styles.filterLabel}>
            Filter Vertical:
          </label>
          <select
            id="cardTypeFilter"
            className={styles.filterSelect}
            value={selectedCardType}
            onChange={(e) => setSelectedCardType(e.target.value)}
          >
            <option value="">All Card Types ({cardTypes.length})</option>
            {cardTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name} ({ct.cardNumberPrefix})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

      {loading && !metrics ? (
        <div className={styles.loading}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginRight: 12,
            }}
          />
          Loading live platform metrics...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Key Metrics Highlight Grid */}
          <div className={styles.highlightGrid}>
            <div className={styles.highlightCard}>
              <div className={styles.highlightHeader}>
                <span className={styles.highlightTitle}>Total Cards</span>
                <span className={styles.highlightIcon}>🎴</span>
              </div>
              <div className={styles.highlightValue}>{cards.total.toLocaleString()}</div>
              <span className={styles.highlightMeta}>
                {selectedCardType ? 'Filtered vertical inventory' : 'Across all platform verticals'}
              </span>
            </div>

            <div className={styles.highlightCard}>
              <div className={styles.highlightHeader}>
                <span className={styles.highlightTitle}>Active Profiles</span>
                <span className={styles.highlightIcon}>🟢</span>
              </div>
              <div className={styles.highlightValue} style={{ color: '#34d399' }}>
                {cards.active.toLocaleString()}
              </div>
              <span className={styles.highlightMeta}>Live cards currently serving traffic</span>
            </div>

            <div className={styles.highlightCard}>
              <div className={styles.highlightHeader}>
                <span className={styles.highlightTitle}>Total Customers</span>
                <span className={styles.highlightIcon}>👥</span>
              </div>
              <div className={styles.highlightValue} style={{ color: '#c084fc' }}>
                {metrics?.totalCustomers.toLocaleString() ?? 0}
              </div>
              <span className={styles.highlightMeta}>Registered customer accounts</span>
            </div>

            <div className={styles.highlightCard}>
              <div className={styles.highlightHeader}>
                <span className={styles.highlightTitle}>Profile Views</span>
                <span className={styles.highlightIcon}>👁️</span>
              </div>
              <div className={styles.highlightValue} style={{ color: '#38bdf8' }}>
                {metrics?.totalViews.toLocaleString() ?? 0}
              </div>
              <span className={styles.highlightMeta}>Total verified visitor page loads</span>
            </div>

            <Link
              href="/admin/replacement-requests"
              className={styles.highlightCard}
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              <div className={styles.highlightHeader}>
                <span className={styles.highlightTitle}>Pending Replacements</span>
                <span className={styles.highlightIcon}>🔄</span>
              </div>
              <div
                className={styles.highlightValue}
                style={{ color: metrics?.pendingReplacements ? '#f87171' : '#94a3b8' }}
              >
                {metrics?.pendingReplacements.toLocaleString() ?? 0}
              </div>
              <span className={styles.highlightMeta}>
                Customer reported lost/stolen requests → Review
              </span>
            </Link>
          </div>

          {/* Full Lifecycle Breakdown Section */}
          <div className={styles.statusSection}>
            <h2 className={styles.sectionTitle}>
              <span>⚡</span> Card Inventory Lifecycle Status
            </h2>
            <div className={styles.statusGrid}>
              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#38bdf8' }} />
                  Available
                </span>
                <span className={styles.statusCount} style={{ color: '#38bdf8' }}>
                  {cards.available.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unassigned & in stock</span>
              </div>

              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#fbbf24' }} />
                  Assigned
                </span>
                <span className={styles.statusCount} style={{ color: '#fbbf24' }}>
                  {cards.assigned.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending first publish</span>
              </div>

              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#34d399' }} />
                  Active
                </span>
                <span className={styles.statusCount} style={{ color: '#34d399' }}>
                  {cards.active.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Publicly accessible</span>
              </div>

              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#fb923c' }} />
                  Paused
                </span>
                <span className={styles.statusCount} style={{ color: '#fb923c' }}>
                  {cards.paused.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Temporarily hidden</span>
              </div>

              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#f87171' }} />
                  Suspended
                </span>
                <span className={styles.statusCount} style={{ color: '#f87171' }}>
                  {cards.suspended.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Admin locked</span>
              </div>

              <div className={styles.statusCard}>
                <span className={styles.statusName}>
                  <span className={styles.statusDot} style={{ background: '#64748b' }} />
                  Deactivated
                </span>
                <span className={styles.statusCount} style={{ color: '#94a3b8' }}>
                  {cards.deactivated.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Permanently dead</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Hub Grid */}
          <div>
            <h2 className={styles.sectionTitle}>
              <span>🛠️</span> Administration Management Modules
            </h2>
            <div className={styles.hubGrid}>
              <Link href="/admin/cards" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div className={styles.hubIcon}>📇</div>
                  <h3 className={styles.hubTitle}>Card Inventory</h3>
                </div>
                <p className={styles.hubDescription}>
                  Search, filter, assign, suspend, deactivate, or replace NFC cards with interactive
                  lifecycle controls.
                </p>
                <span className={styles.hubAction}>Manage Cards →</span>
              </Link>

              <Link href="/admin/generate" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div
                    className={styles.hubIcon}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    🚀
                  </div>
                  <h3 className={styles.hubTitle}>Bulk Generation</h3>
                </div>
                <p className={styles.hubDescription}>
                  Enqueue pg-boss background generation jobs, poll progress in real time, and export
                  CSVs for manufacturing.
                </p>
                <span className={styles.hubAction} style={{ color: '#38bdf8' }}>
                  Generate Batches →
                </span>
              </Link>

              <Link href="/admin/card-types" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div
                    className={styles.hubIcon}
                    style={{
                      background: 'rgba(52, 211, 153, 0.15)',
                      borderColor: 'rgba(52, 211, 153, 0.3)',
                    }}
                  >
                    🏷️
                  </div>
                  <h3 className={styles.hubTitle}>Card Types & Schemas</h3>
                </div>
                <p className={styles.hubDescription}>
                  Configure industry verticals (Business, College), custom field schemas, default
                  visibility, and validation.
                </p>
                <span className={styles.hubAction} style={{ color: '#34d399' }}>
                  Configure Verticals →
                </span>
              </Link>

              <Link href="/admin/templates" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div
                    className={styles.hubIcon}
                    style={{
                      background: 'rgba(251, 146, 60, 0.15)',
                      borderColor: 'rgba(251, 146, 60, 0.3)',
                    }}
                  >
                    🎨
                  </div>
                  <h3 className={styles.hubTitle}>Template Library</h3>
                </div>
                <p className={styles.hubDescription}>
                  Manage React Server Component templates, set display order, mark free/premium, and
                  toggle activation.
                </p>
                <span className={styles.hubAction} style={{ color: '#fb923c' }}>
                  Manage Templates →
                </span>
              </Link>

              <Link href="/admin/customers" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div
                    className={styles.hubIcon}
                    style={{
                      background: 'rgba(192, 132, 252, 0.15)',
                      borderColor: 'rgba(192, 132, 252, 0.3)',
                    }}
                  >
                    👥
                  </div>
                  <h3 className={styles.hubTitle}>Customer Directory</h3>
                </div>
                <p className={styles.hubDescription}>
                  Lookup registered customers by phone, email, or name, and inspect their active NFC
                  card assignments.
                </p>
                <span className={styles.hubAction} style={{ color: '#c084fc' }}>
                  View Customers →
                </span>
              </Link>

              <Link href="/admin/analytics" className={styles.hubCard}>
                <div className={styles.hubCardHeader}>
                  <div
                    className={styles.hubIcon}
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      borderColor: 'rgba(244, 63, 94, 0.3)',
                    }}
                  >
                    📈
                  </div>
                  <h3 className={styles.hubTitle}>Platform Telemetry</h3>
                </div>
                <p className={styles.hubDescription}>
                  Inspect interaction events, 14-day daily views trends, click-through breakdowns,
                  and scan ratios.
                </p>
                <span className={styles.hubAction} style={{ color: '#f43f5e' }}>
                  Explore Analytics →
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
