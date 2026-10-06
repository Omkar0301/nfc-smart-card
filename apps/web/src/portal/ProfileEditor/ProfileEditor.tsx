'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { FieldSchemaItem, UserProfileResponse } from '@nfc-card/shared';
import {
  getProfile,
  publishProfile,
  saveProfile,
  unpublishProfile,
} from '@/src/shared/api/profile';
import { FieldRenderer } from '@/src/shared/FieldRenderer';
import { VisibilitySummary } from './VisibilitySummary';
import { PublishBar } from './PublishBar';
import styles from './ProfileEditor.module.css';

export function ProfileEditor() {
  const [profileData, setProfileData] = useState<UserProfileResponse['profile'] | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [noActiveCard, setNoActiveCard] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      setProfileData(res.profile);
      setFormData(res.profile.data || {});
      setVisibilityMap(res.profile.fieldVisibility || {});
      setIsDirty(false);
    } catch (err: any) {
      if (err?.code === 'NO_ACTIVE_CARD' || err?.status === 404) {
        setNoActiveCard(true);
      } else {
        setAlert({
          type: 'error',
          message: err?.message || 'Failed to load profile. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fieldSchema: FieldSchemaItem[] = useMemo(() => {
    return (profileData?.cardType?.fieldSchema as FieldSchemaItem[]) || [];
  }, [profileData]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setIsDirty(true);
    setAlert(null);
  };

  const handleToggleVisibility = (key: string, isVisible: boolean) => {
    setVisibilityMap((prev) => ({
      ...prev,
      [key]: isVisible,
    }));
    setIsDirty(true);
    setAlert(null);
  };

  const { canPublish, missingRequiredLabels } = useMemo(() => {
    const missing: string[] = [];
    for (const field of fieldSchema) {
      if (field.required) {
        const val = formData[field.key];
        const isMissing =
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '') ||
          (Array.isArray(val) && val.length === 0);
        if (isMissing) {
          missing.push(field.label || field.key);
        }
      }
    }
    return {
      canPublish: missing.length === 0,
      missingRequiredLabels: missing,
    };
  }, [fieldSchema, formData]);

  const { visibleCount, hiddenCount } = useMemo(() => {
    let visible = 0;
    let hidden = 0;
    for (const field of fieldSchema) {
      const isVis = field.key in visibilityMap ? visibilityMap[field.key] : field.defaultVisible;
      if (isVis) {
        visible++;
      } else {
        hidden++;
      }
    }
    return { visibleCount: visible, hiddenCount: hidden };
  }, [fieldSchema, visibilityMap]);

  const handleSave = async () => {
    if (!profileData) return;
    try {
      setIsSaving(true);
      setAlert(null);
      const res = await saveProfile(formData, visibilityMap, profileData.templateId);
      setProfileData(res.profile);
      setFormData(res.profile.data || {});
      setVisibilityMap(res.profile.fieldVisibility || {});
      setIsDirty(false);
      setAlert({
        type: 'success',
        message: 'Draft saved successfully.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to save profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!profileData) return;
    if (!canPublish) {
      setAlert({
        type: 'error',
        message: `Please fill in required fields: ${missingRequiredLabels.join(', ')}`,
      });
      return;
    }

    try {
      setIsPublishing(true);
      setAlert(null);
      const res = await publishProfile(formData, visibilityMap, profileData.templateId);
      setProfileData(res.profile);
      setFormData(res.profile.data || {});
      setVisibilityMap(res.profile.fieldVisibility || {});
      setIsDirty(false);
      setAlert({
        type: 'success',
        message: '🎉 Profile published successfully! Your card is now active.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to publish profile.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!profileData) return;
    try {
      setIsPublishing(true);
      setAlert(null);
      const res = await unpublishProfile();
      setProfileData(res.profile);
      setFormData(res.profile.data || {});
      setVisibilityMap(res.profile.fieldVisibility || {});
      setIsDirty(false);
      setAlert({
        type: 'success',
        message: 'Profile moved to draft. Your card is paused for public visitors.',
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.message || 'Failed to unpublish profile.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (noActiveCard) {
    return (
      <div className={styles.errorWrapper}>
        <div style={{ fontSize: '3rem' }}>📇</div>
        <h2>No Active Card Found</h2>
        <p className={styles.subtitle}>
          You don&apos;t have an assigned NFC card yet. Please activate or claim a card first.
        </p>
        <Link
          href="/portal/dashboard"
          style={{
            marginTop: 16,
            display: 'inline-block',
            padding: '10px 20px',
            background: '#6366f1',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.errorWrapper}>
        <h2>Error Loading Profile</h2>
        <button
          type="button"
          onClick={fetchProfileData}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { card, cardType } = profileData;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Card Profile Editor</h1>
          <div className={styles.cardBadge}>
            <span
              className={`${styles.cardDot} ${
                card.status === 'ACTIVE'
                  ? styles.dotActive
                  : card.status === 'ASSIGNED'
                    ? styles.dotAssigned
                    : styles.dotPaused
              }`}
            />
            <span>
              {cardType.name} · {card.cardNumber}
            </span>
          </div>
        </div>
        <p className={styles.subtitle}>
          Customize what appears when someone taps your physical NFC card. Control privacy and
          visibility for every field.
        </p>
      </header>

      {alert && (
        <div
          className={`${styles.alert} ${
            alert.type === 'success' ? styles.alertSuccess : styles.alertError
          }`}
        >
          <span>{alert.message}</span>
          <button type="button" className={styles.alertCloseBtn} onClick={() => setAlert(null)}>
            ✕
          </button>
        </div>
      )}

      <VisibilitySummary
        totalFields={fieldSchema.length}
        visibleCount={visibleCount}
        hiddenCount={hiddenCount}
      />

      <section className={styles.formSection}>
        {fieldSchema.map((field) => {
          const isVisible =
            field.key in visibilityMap ? visibilityMap[field.key] : field.defaultVisible;

          return (
            <FieldRenderer
              key={field.key}
              field={field}
              value={formData[field.key]}
              isVisible={isVisible}
              onChange={(val) => handleFieldChange(field.key, val)}
              onToggleVisibility={(vis) => handleToggleVisibility(field.key, vis)}
              disabled={isSaving || isPublishing}
            />
          );
        })}
      </section>

      <PublishBar
        status={profileData.status}
        isDirty={isDirty}
        isSaving={isSaving}
        isPublishing={isPublishing}
        publicToken={card.publicToken}
        cardTypeSlug={cardType.slug}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        canPublish={canPublish}
      />
    </div>
  );
}
