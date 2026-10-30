'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GenerateCards } from '@/src/admin/CardManagement/GenerateCards';
import { JobStatus } from '@/src/admin/CardManagement/JobStatus';
import { BatchInvalidate } from '@/src/admin/CardManagement/BatchInvalidate';
import styles from '@/src/admin/CardManagement/CardManagement.module.css';

type GenerateTab = 'generate' | 'jobs' | 'invalidate';

export function AdminGenerateClient() {
  const [activeTab, setActiveTab] = useState<GenerateTab>('generate');
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
            <Link href="/admin/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>
              ← Operations Dashboard
            </Link>
          </div>
          <h1 className={styles.title}>Bulk NFC Card Generation</h1>
          <p className={styles.subtitle}>
            Trigger asynchronous pg-boss card generation background jobs, monitor token generation
            in real time, and handle manufacturing QC batch invalidations.
          </p>
        </div>
      </div>

      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'generate' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          ⚡ New Generation Batch
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'jobs' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          📊 Jobs & Monitoring {activeJobId ? '●' : ''}
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'invalidate' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('invalidate')}
        >
          🚨 Defective Batch QC
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {activeTab === 'generate' && <GenerateCards onJobStarted={handleJobStarted} />}
        {activeTab === 'jobs' && (
          <JobStatus
            activeJobId={activeJobId}
            onSelectBatchForInvalidation={handleSelectBatchForInvalidation}
          />
        )}
        {activeTab === 'invalidate' && (
          <BatchInvalidate
            initialBatchId={invalidationBatchId}
            onSuccess={() => setInvalidationBatchId('')}
          />
        )}
      </div>
    </div>
  );
}
