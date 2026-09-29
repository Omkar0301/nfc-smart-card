'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CardList } from './CardList';
import { CardDetail } from './CardDetail';
import { GenerateCards } from './GenerateCards';
import { JobStatus } from './JobStatus';
import { BatchInvalidate } from './BatchInvalidate';
import { CardExport } from './CardExport';
import styles from './CardManagement.module.css';

type ActiveTab = 'inventory' | 'generate' | 'jobs' | 'export' | 'invalidate';

export function CardManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [invalidationBatchId, setInvalidationBatchId] = useState<string>('');

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
    setSelectedCardId(null);
    setActiveTab('jobs');
  };

  const handleSelectBatchForInvalidation = (batchId: string) => {
    setInvalidationBatchId(batchId);
    setSelectedCardId(null);
    setActiveTab('invalidate');
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setSelectedCardId(null);
    setActiveTab(tab);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div style={{ marginBottom: 8, fontSize: 13 }}>
            <Link href="/admin/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>
              ← Admin Dashboard
            </Link>
          </div>
          <h1 className={styles.title}>NFC Card Inventory & Lifecycle Management</h1>
          <p className={styles.subtitle}>
            Search, filter, and manage card lifecycles (assign, activate, suspend, replace,
            deactivate), bulk generation background jobs, and CSV export for manufacturers.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'inventory' && !selectedCardId ? styles.tabButtonActive : ''}`}
          onClick={() => handleSelectTab('inventory')}
        >
          📇 Card Inventory
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'generate' ? styles.tabButtonActive : ''}`}
          onClick={() => handleSelectTab('generate')}
        >
          ⚡ Generate Cards
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'jobs' ? styles.tabButtonActive : ''}`}
          onClick={() => handleSelectTab('jobs')}
        >
          📊 Jobs & History {activeJobId ? '●' : ''}
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'export' ? styles.tabButtonActive : ''}`}
          onClick={() => handleSelectTab('export')}
        >
          📥 CSV Export
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'invalidate' ? styles.tabButtonActive : ''}`}
          onClick={() => handleSelectTab('invalidate')}
        >
          🚨 Defective Batch QC
        </button>
      </div>

      {/* Tab Contents */}
      {selectedCardId ? (
        <CardDetail cardId={selectedCardId} onBack={() => setSelectedCardId(null)} />
      ) : (
        <>
          {activeTab === 'inventory' && (
            <CardList onSelectCard={(cardId) => setSelectedCardId(cardId)} />
          )}

          {activeTab === 'generate' && <GenerateCards onJobStarted={handleJobStarted} />}

          {activeTab === 'jobs' && (
            <JobStatus
              activeJobId={activeJobId}
              onSelectBatchForInvalidation={handleSelectBatchForInvalidation}
            />
          )}

          {activeTab === 'export' && <CardExport />}

          {activeTab === 'invalidate' && (
            <BatchInvalidate
              initialBatchId={invalidationBatchId}
              onSuccess={() => setInvalidationBatchId('')}
            />
          )}
        </>
      )}
    </div>
  );
}
