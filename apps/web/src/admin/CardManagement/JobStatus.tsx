'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { GenerationJob } from '@nfc-card/shared';
import { getJobStatus, listRecentJobs, downloadCardsCsv } from '../../shared/api/cards';
import styles from './CardManagement.module.css';

interface JobStatusProps {
  activeJobId?: string | null;
  onSelectBatchForInvalidation?: (batchId: string) => void;
  onJobComplete?: (job: GenerationJob) => void;
}

export function JobStatus({
  activeJobId,
  onSelectBatchForInvalidation,
  onJobComplete,
}: JobStatusProps) {
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<GenerationJob[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingBatchId, setExportingBatchId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const jobs = await listRecentJobs();
      setRecentJobs(jobs);
    } catch (err: any) {
      // Non-blocking error for background list
      console.error('Failed to load recent generation jobs:', err);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  // Poll active job
  useEffect(() => {
    if (!activeJobId) {
      setActiveJob(null);
      return;
    }

    let isSubscribed = true;

    const poll = async () => {
      try {
        const job = await getJobStatus(activeJobId);
        if (!isSubscribed) return;

        setActiveJob(job);

        const isFinished = ['COMPLETED', 'FAILED', 'PARTIAL'].includes(job.status);
        if (isFinished) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          fetchRecent();
          onJobComplete?.(job);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setError(err.message || 'Failed to fetch job status');
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 1500);

    return () => {
      isSubscribed = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeJobId, fetchRecent, onJobComplete]);

  // Initial fetch of recent jobs
  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleExportCsv = async (batchId: string) => {
    try {
      setExportingBatchId(batchId);
      await downloadCardsCsv({ batchId });
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExportingBatchId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className={styles.badgeRunning}>Running</span>;
      case 'COMPLETED':
        return <span className={styles.badgeCompleted}>Completed</span>;
      case 'FAILED':
        return <span className={styles.badgeFailed}>Failed</span>;
      case 'PARTIAL':
        return <span className={styles.badgePartial}>Partial</span>;
      case 'PENDING':
      default:
        return <span className={styles.badgePending}>Pending</span>;
    }
  };

  return (
    <div>
      {error && <div className={`${styles.banner} ${styles.errorBanner}`}>{error}</div>}

      {/* Active Job tracker if running or provided */}
      {activeJob && (
        <div
          className={styles.jobCard}
          style={{ borderLeft: '4px solid #3b82f6', marginBottom: 28 }}
        >
          <div className={styles.jobHeader}>
            <div>
              <h3 className={styles.jobTitle}>
                Active Generation Job <code className={styles.previewCode}>{activeJob.id}</code>
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Batch ID: <code>{activeJob.batchId}</code>
              </div>
            </div>
            {getStatusBadge(activeJob.status)}
          </div>

          <div className={styles.progressContainer}>
            <div
              className={`${styles.progressBar} ${
                activeJob.status === 'RUNNING' ? styles.progressBarRunning : ''
              }`}
              style={{
                width: `${
                  activeJob.quantity > 0
                    ? Math.min(100, Math.round((activeJob.generated / activeJob.quantity) * 100))
                    : 0
                }%`,
              }}
            />
          </div>

          <div className={styles.jobMeta}>
            <span>
              <strong>{activeJob.generated}</strong> of <strong>{activeJob.quantity}</strong> cards
              generated (
              {activeJob.quantity > 0
                ? Math.round((activeJob.generated / activeJob.quantity) * 100)
                : 0}
              %)
            </span>
            <span>
              {activeJob.completedAt
                ? `Finished at ${new Date(activeJob.completedAt).toLocaleTimeString()}`
                : activeJob.startedAt
                  ? `Started at ${new Date(activeJob.startedAt).toLocaleTimeString()}`
                  : 'Queued in pg-boss'}
            </span>
          </div>

          {activeJob.errorMessage && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: '#fee2e2',
                color: '#b91c1c',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              Error: {activeJob.errorMessage}
            </div>
          )}

          {activeJob.status === 'COMPLETED' && (
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => handleExportCsv(activeJob.batchId)}
                disabled={exportingBatchId === activeJob.batchId}
              >
                {exportingBatchId === activeJob.batchId ? 'Exporting...' : '📥 Export Batch to CSV'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Jobs History */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Generation Job History</h3>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={fetchRecent}
          disabled={loadingRecent}
        >
          {loadingRecent ? 'Refreshing...' : '🔄 Refresh Jobs'}
        </button>
      </div>

      {recentJobs.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: 8,
            color: '#64748b',
          }}
        >
          No card generation jobs recorded yet.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Batch / Job ID</th>
                <th>Card Type</th>
                <th>Progress</th>
                <th>Created At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => {
                const percent =
                  job.quantity > 0
                    ? Math.min(100, Math.round((job.generated / job.quantity) * 100))
                    : 0;
                return (
                  <tr key={job.id}>
                    <td>{getStatusBadge(job.status)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a' }}>
                        Batch: <code style={{ fontSize: 11 }}>{job.batchId.slice(0, 8)}...</code>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Job: {job.id.slice(0, 10)}...
                      </div>
                    </td>
                    <td>{(job as any).cardType?.name || job.cardTypeId}</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                        {job.generated} / {job.quantity} ({percent}%)
                      </div>
                      <div className={styles.progressContainer} style={{ height: 6, margin: 0 }}>
                        <div className={styles.progressBar} style={{ width: `${percent}%` }} />
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        style={{ padding: '4px 8px', fontSize: 12, marginRight: 6 }}
                        onClick={() => handleExportCsv(job.batchId)}
                        disabled={exportingBatchId === job.batchId}
                        title="Download CSV for this batch"
                      >
                        {exportingBatchId === job.batchId ? '...' : 'CSV'}
                      </button>
                      {onSelectBatchForInvalidation && (
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => onSelectBatchForInvalidation(job.batchId)}
                          title="Invalidate AVAILABLE cards in this defective batch"
                        >
                          Invalidate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
