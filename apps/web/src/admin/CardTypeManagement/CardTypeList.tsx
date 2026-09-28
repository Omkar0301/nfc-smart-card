'use client';

import React, { useEffect, useState } from 'react';
import type { CardType } from '@nfc-card/shared';
import { listCardTypes } from '../../shared/api/cardTypes';
import { CardTypeForm } from './CardTypeForm';
import styles from './CardTypeManagement.module.css';

export function CardTypeList() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedForEdit, setSelectedForEdit] = useState<CardType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCardTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCardTypes();
      setCardTypes(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load card types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCardTypes();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Card Type & Vertical Management</h1>
          <p className={styles.subtitle}>
            Manage card types, customize field schemas, and configure public profile visibility
            defaults.
          </p>
        </div>
        <button type="button" className={styles.primaryBtn} onClick={() => setIsCreating(true)}>
          + Add New Card Type
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Loading card types...
        </div>
      ) : cardTypes.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
          <p style={{ margin: '0 0 12px 0', color: '#64748b' }}>No card types configured yet.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => setIsCreating(true)}>
            Create First Card Type
          </button>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {cardTypes.map((ct) => {
            const fieldCount = Array.isArray(ct.fieldSchema) ? ct.fieldSchema.length : 0;
            const cardCount = ct._count?.cards ?? 0;
            const isExpanded = expandedId === ct.id;

            return (
              <div key={ct.id} className={styles.cardItem}>
                <div>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardName}>{ct.name}</h2>
                      <span className={styles.cardSlug}>slug: /{ct.slug}</span>
                    </div>
                    <span
                      className={
                        ct.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive
                      }
                    >
                      {ct.status}
                    </span>
                  </div>

                  <p className={styles.cardDesc}>{ct.description || 'No description provided.'}</p>

                  <div className={styles.cardStats}>
                    <span>
                      📋 <strong>{fieldCount}</strong> Fields
                    </span>
                    <span>
                      💳 <strong>{cardCount}</strong> Cards Issued
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: 12,
                        marginBottom: 16,
                        maxHeight: 220,
                        overflowY: 'auto',
                      }}
                    >
                      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#334155' }}>
                        Field Schema:
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ct.fieldSchema.map((field, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 12,
                              padding: '3px 0',
                              borderBottom: '1px solid #f1f5f9',
                            }}
                          >
                            <span>
                              <strong>{field.label}</strong>{' '}
                              <code style={{ fontSize: 11, color: '#64748b' }}>({field.key})</code>
                            </span>
                            <span style={{ color: '#475569' }}>
                              [{field.type}]
                              {field.required && (
                                <span style={{ color: '#b91c1c', marginLeft: 4 }}>*required</span>
                              )}
                              {!field.defaultVisible && (
                                <span style={{ color: '#d97706', marginLeft: 4 }}>
                                  (hidden by default)
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setExpandedId(isExpanded ? null : ct.id)}
                  >
                    {isExpanded ? 'Hide Fields' : 'View Fields'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setSelectedForEdit(ct)}
                  >
                    Edit Schema
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(isCreating || selectedForEdit) && (
        <CardTypeForm
          cardType={selectedForEdit}
          onSuccess={() => {
            setIsCreating(false);
            setSelectedForEdit(null);
            fetchCardTypes();
          }}
          onCancel={() => {
            setIsCreating(false);
            setSelectedForEdit(null);
          }}
        />
      )}
    </div>
  );
}
