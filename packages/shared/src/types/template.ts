import type { FieldSchema } from './fieldSchema.js';

/**
 * Already visibility-filtered profile field values (server-side filtered by
 * `Profile.fieldVisibility` + `CardType.fieldSchema[].defaultVisible`).
 */
export interface PublicProfileData {
  [key: string]: string | string[] | null;
}

export interface TemplateCardInfo {
  publicToken: string;
  cardNumber: string;
  /** Absolute URL of the public profile — used for share/save-contact CTAs. */
  profileUrl?: string;
  /** Populated by F-013; templates render a save-contact CTA when present. */
  saveContactHref?: string;
}

export interface TemplateProfileInfo {
  data: PublicProfileData;
  fieldSchema: FieldSchema;
}

/**
 * Shared props interface every MVP template component conforms to (F-009).
 * Templates are pure components — safe to render as a Next.js React Server
 * Component on the public route and as a client component in the portal preview.
 */
export interface TemplateProps {
  profile: TemplateProfileInfo;
  card: TemplateCardInfo;
  /** `Template.configuration` JSONB column — template-specific overrides. */
  configuration?: Record<string, unknown>;
  /** True inside the portal preview — suppresses analytics/side effects. */
  isPreview?: boolean;
}

export type TemplateComponent = (props: TemplateProps) => unknown;

/** Serializable template metadata returned by the templates API. */
export interface TemplateSummary {
  id: string;
  cardTypeId: string;
  cardTypeSlug?: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
  configuration: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}
