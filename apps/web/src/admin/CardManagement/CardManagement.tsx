'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GenerateCards } from './GenerateCards';
import { JobStatus } from './JobStatus';
import { BatchInvalidate } from './BatchInvalidate';
import { CardExport } from './CardExport';
import styles from './CardManagement.module.css';

type ActiveTab = 'generate' | 'jobs' | 'export' | 'invalidate';

export function CardManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [invalidationBatchId, setInvalidationBatchId] = useState<string>('');

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
    setActiveTab('jobs');
  };

  const handleSelectBatchForInvalidation = (batchId: string) => {
    setInvalidationBatchId(batchId);
    setActiveTab('invalidate');
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
          <h1 className={styles.title}>NFC Card Inventory & Generation</h1>
          <p className={styles.subtitle}>
            Manage bulk card generation jobs, export printing CSVs for manufacturers, and perform QC
            batch invalidations.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'generate' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          ⚡ Generate Cards
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'jobs' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          📊 Jobs & History {activeJobId ? '●' : ''}
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'export' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📥 CSV Export
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'invalidate' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('invalidate')}
        >
          🚨 Defective Batch QC
        </button>
      </div>

      {/* Tab Contents */}
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
    </div>
  );
}
