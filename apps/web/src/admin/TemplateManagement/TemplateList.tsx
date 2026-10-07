'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CardType, TemplateSummary } from '@nfc-card/shared';
import { listCardTypes } from '../../shared/api/cardTypes';
import { deleteTemplate, listAllTemplates, updateTemplate } from '../../shared/api/templates';
import { TemplateForm } from './TemplateForm';
import styles from './TemplateManagement.module.css';

interface Banner {
  type: 'success' | 'error' | 'warning';
  message: string;
}

function TemplateRowCard({
  template,
  onRefetch,
  onEdit,
  onBanner,
}: {
  template: TemplateSummary;
  onRefetch: () => void;
  onEdit: (template: TemplateSummary) => void;
  onBanner: (banner: Banner) => void;
}) {
  const [sortOrder, setSortOrder] = useState(template.sortOrder);
  const [thumbnail, setThumbnail] = useState(template.thumbnail ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSortOrder(template.sortOrder);
    setThumbnail(template.thumbnail ?? '');
  }, [template.sortOrder, template.thumbnail]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      onRefetch();
    } catch (err: any) {
      onBanner({ type: 'error', message: err?.message ?? 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const description =
    typeof template.configuration?.description === 'string'
      ? (template.configuration.description as string)
      : null;

  const handleDelete = async () => {
    if (!window.confirm(`Delete or deactivate the “${template.name}” template?`)) return;
    setBusy(true);
    try {
      const result = await deleteTemplate(template.id);
      onBanner(
        result.deactivated
          ? { type: 'warning', message: result.warning ?? 'Template deactivated.' }
          : { type: 'success', message: 'Template deleted.' }
      );
      onRefetch();
    } catch (err: any) {
      onBanner({ type: 'error', message: err?.message ?? 'Failed to delete template.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`${styles.card} ${template.isActive ? '' : styles.cardInactive}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardName}>{template.name}</h3>
          <span className={styles.slug}>{template.slug}</span>
        </div>
        <div className={styles.badges}>
          <span
            className={`${styles.badge} ${template.isActive ? styles.badgeActive : styles.badgeInactive}`}
          >
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
          <span
            className={`${styles.badge} ${template.isPremium ? styles.badgePremium : styles.badgeFree}`}
          >
            {template.isPremium ? 'Premium' : 'Free'}
          </span>
        </div>
      </div>

      {description ? <p className={styles.desc}>{description}</p> : null}

      <div className={styles.row}>
        <div>
          <label className={styles.fieldLabel}>Sort order</label>
          <input
            type="number"
            min={0}
            className={styles.input}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            disabled={busy}
          />
        </div>
        <div>
          <label className={styles.fieldLabel}>Thumbnail URL</label>
          <input
            className={styles.input}
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://…"
            disabled={busy}
          />
        </div>
      </div>

      <div className={styles.checkRow}>
        <label>
          <input
            type="checkbox"
            checked={template.isActive}
            onChange={(e) => run(() => updateTemplate(template.id, { isActive: e.target.checked }))}
            disabled={busy}
          />{' '}
          Active
        </label>
        <label>
          <input
            type="checkbox"
            checked={template.isPremium}
            onChange={(e) =>
              run(() => updateTemplate(template.id, { isPremium: e.target.checked }))
            }
            disabled={busy}
          />{' '}
          Premium
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => onEdit(template)}
          disabled={busy}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() =>
            run(() =>
              updateTemplate(template.id, { sortOrder, thumbnail: thumbnail.trim() || null })
            )
          }
          disabled={busy}
        >
          Save layout
        </button>
        <button type="button" className={styles.dangerBtn} onClick={handleDelete} disabled={busy}>
          Delete
        </button>
      </div>
    </article>
  );
}

export function TemplateList() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateSummary | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tmpl, types] = await Promise.all([listAllTemplates(), listCardTypes()]);
      setTemplates(tmpl);
      setCardTypes(types);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const groups = useMemo(() => {
    const byType = new Map<string, TemplateSummary[]>();
    for (const t of templates) {
      const key = t.cardTypeId;
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key)!.push(t);
    }
    return Array.from(byType.entries()).sort((a, b) => a[1][0].slug.localeCompare(b[1][0].slug));
  }, [templates]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Template Library Management</h1>
          <p className={styles.subtitle}>
            Manage which templates are active per card type, set display order, mark free or
            premium, and update thumbnails. Template components live in{' '}
            <code>@nfc-card/shared/templates</code>.
          </p>
        </div>
        <button type="button" className={styles.primaryBtn} onClick={() => setIsCreating(true)}>
          + Add Template
        </button>
      </div>

      {banner && (
        <div
          className={`${styles.banner} ${
            banner.type === 'success'
              ? styles.bannerSuccess
              : banner.type === 'warning'
                ? styles.bannerWarning
                : styles.bannerError
          }`}
        >
          {banner.message}
        </div>
      )}

      {error && <div className={`${styles.banner} ${styles.bannerError}`}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading templates…</div>
      ) : groups.length === 0 ? (
        <div className={styles.empty}>
          <p style={{ margin: '0 0 12px' }}>No templates configured yet.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => setIsCreating(true)}>
            Create the first template
          </button>
        </div>
      ) : (
        groups.map(([cardTypeId, group]) => {
          const cardType = cardTypes.find((ct) => ct.id === cardTypeId);
          return (
            <section key={cardTypeId} className={styles.group}>
              <h2 className={styles.groupTitle}>
                {cardType?.name ?? group[0].cardTypeSlug ?? 'Card type'}
                <span className={styles.groupSlug}>{cardType?.slug ?? group[0].cardTypeSlug}</span>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                  {group.length} template{group.length === 1 ? '' : 's'}
                </span>
              </h2>
              <div className={styles.grid}>
                {group.map((template) => (
                  <TemplateRowCard
                    key={template.id}
                    template={template}
                    onRefetch={fetchAll}
                    onEdit={setEditing}
                    onBanner={setBanner}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {(isCreating || editing) && (
        <TemplateForm
          template={editing}
          cardTypes={cardTypes}
          onSuccess={() => {
            setIsCreating(false);
            setEditing(null);
            setBanner({ type: 'success', message: 'Template saved.' });
            fetchAll();
          }}
          onCancel={() => {
            setIsCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
