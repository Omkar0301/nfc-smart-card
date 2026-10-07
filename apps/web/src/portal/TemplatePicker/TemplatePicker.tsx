'use client';

/* eslint-disable @next/next/no-img-element -- admin-supplied thumbnail URLs are arbitrary and unoptimized */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  FieldSchemaItem,
  PublicProfileData,
  TemplateProps,
  TemplateSummary,
  UserProfileResponse,
} from '@nfc-card/shared';
import { TemplateRenderer } from '@nfc-card/shared/templates';
import { getProfile, updateProfile } from '@/src/shared/api/profile';
import { listTemplates } from '@/src/shared/api/templates';
import { TemplatePreview } from './TemplatePreview';
import styles from './TemplatePicker.module.css';

type Profile = UserProfileResponse['profile'];

/** Build the visibility-filtered data a public visitor would actually see. */
function buildPublicData(profile: Profile): PublicProfileData {
  const out: PublicProfileData = {};
  const schema = (profile.cardType.fieldSchema as FieldSchemaItem[]) ?? [];

  for (const field of schema) {
    const visible =
      field.key in profile.fieldVisibility
        ? profile.fieldVisibility[field.key]
        : field.defaultVisible;
    if (!visible) continue;

    const value = profile.data?.[field.key];
    if (value === undefined || value === null || value === '') continue;
    out[field.key] = value as string | string[];
  }

  return out;
}

function templateDescription(template: TemplateSummary): string {
  const description = template.configuration?.description;
  return typeof description === 'string' && description.length > 0
    ? description
    : 'A hand-crafted layout for your card type.';
}

export function TemplatePicker() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [noActiveCard, setNoActiveCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewing, setPreviewing] = useState<TemplateSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getProfile();
        setProfile(res.profile);
        const list = await listTemplates(res.profile.cardType.slug);
        setTemplates(list);
      } catch (err: any) {
        if (err?.code === 'NO_ACTIVE_CARD' || err?.status === 404) {
          setNoActiveCard(true);
        } else {
          setError(err?.message ?? 'Failed to load templates.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const templateProps: TemplateProps | null = useMemo(() => {
    if (!profile) return null;
    const domain = process.env.NEXT_PUBLIC_DOMAIN;
    return {
      profile: {
        data: buildPublicData(profile),
        fieldSchema: (profile.cardType.fieldSchema as FieldSchemaItem[]) ?? [],
      },
      card: {
        publicToken: profile.card.publicToken,
        cardNumber: profile.card.cardNumber,
        profileUrl: domain
          ? `https://${domain}/p/${profile.cardType.slug}/${profile.card.publicToken}`
          : undefined,
      },
      isPreview: true,
    };
  }, [profile]);

  const handleUse = async (template: TemplateSummary) => {
    setIsSaving(true);
    setBanner(null);
    try {
      await updateProfile({ templateId: template.id });
      const res = await getProfile();
      setProfile(res.profile);
      setPreviewing(null);
      setBanner({
        type: 'success',
        message: `“${template.name}” is now your template. Your public page switches instantly — your card URL never changes.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.message ?? 'Failed to switch template. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <p>Loading your template gallery…</p>
      </div>
    );
  }

  if (noActiveCard) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div style={{ fontSize: '3rem' }}>📇</div>
          <h2>No Active Card Found</h2>
          <p>You need an assigned NFC card before choosing a template.</p>
          <Link
            href="/portal/dashboard"
            className={styles.secondaryBtn}
            style={{ display: 'inline-block' }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!templateProps || !profile) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>{error ?? 'Unable to load your templates.'}</p>
        </div>
      </div>
    );
  }

  const activeTemplateId = profile.templateId ?? null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Choose your template</h1>
          <p className={styles.subtitle}>
            Templates built for {profile.cardType.name}. Preview each design with your real profile
            data before applying it — switching never changes your NFC card or its URL.
          </p>
        </div>
        <div className={styles.cardBadge}>
          {profile.cardType.name} · {profile.card.cardNumber}
        </div>
      </header>

      {banner && (
        <div
          className={`${styles.banner} ${
            banner.type === 'success' ? styles.bannerSuccess : styles.bannerError
          }`}
        >
          {banner.message}
        </div>
      )}

      {templates.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No templates are available for your card type yet.</p>
          <p style={{ fontSize: 13 }}>Please check back soon.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map((template) => {
            const isActive = template.id === activeTemplateId;
            return (
              <article
                key={template.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              >
                {template.thumbnail ? (
                  <img
                    className={styles.thumb}
                    src={template.thumbnail}
                    alt={`${template.name} preview`}
                  />
                ) : (
                  <div className={styles.miniViewport} aria-hidden>
                    <div className={styles.miniScaler}>
                      <TemplateRenderer slug={template.slug} {...templateProps} />
                    </div>
                  </div>
                )}

                <div className={styles.cardBody}>
                  <div className={styles.cardNameRow}>
                    <h2 className={styles.cardName}>{template.name}</h2>
                    <span
                      className={`${styles.badge} ${
                        isActive
                          ? styles.badgeCurrent
                          : template.isPremium
                            ? styles.badgePremium
                            : styles.badgeFree
                      }`}
                    >
                      {isActive ? 'Current' : template.isPremium ? 'Premium' : 'Free'}
                    </span>
                  </div>

                  <p className={styles.cardDesc}>{templateDescription(template)}</p>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => {
                        setBanner(null);
                        setPreviewing(template);
                      }}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={isActive || isSaving}
                      onClick={() => handleUse(template)}
                    >
                      {isActive ? 'Active' : 'Use template'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previewing && templateProps && (
        <TemplatePreview
          template={previewing}
          templateProps={templateProps}
          isActive={previewing.id === activeTemplateId}
          isSaving={isSaving}
          onUse={handleUse}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
