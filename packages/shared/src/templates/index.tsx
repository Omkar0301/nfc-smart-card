import type { ReactElement } from 'react';
import type { TemplateComponent, TemplateProps } from '../types/template.js';
import { BusinessModern } from './business/BusinessModern.js';
import { BusinessMinimal } from './business/BusinessMinimal.js';
import { BusinessPremium } from './business/BusinessPremium.js';
import { CollegeAcademic } from './college/CollegeAcademic.js';
import { CollegeModern } from './college/CollegeModern.js';
import { CollegeCreative } from './college/CollegeCreative.js';

export * from './helpers.js';

/**
 * Registry of hand-built MVP template components (F-009), keyed by the globally
 * unique `Template.slug` values seeded in `apps/api/prisma/seed.ts`.
 */
export const templateRegistry: Record<string, TemplateComponent> = {
  'business-modern': BusinessModern,
  'business-minimal': BusinessMinimal,
  'business-premium': BusinessPremium,
  'college-academic': CollegeAcademic,
  'college-modern': CollegeModern,
  'college-creative': CollegeCreative,
};

export function getTemplateComponent(
  slug: string | null | undefined
): TemplateComponent | undefined {
  if (!slug) return undefined;
  return templateRegistry[slug];
}

export function hasTemplateComponent(slug: string | null | undefined): boolean {
  return Boolean(getTemplateComponent(slug));
}

export function listTemplateSlugs(): string[] {
  return Object.keys(templateRegistry);
}

function TemplateFallback({ slug }: { slug: string }) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        color: '#475569',
      }}
    >
      <div>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎨</div>
        <p style={{ margin: 0, fontSize: 15 }}>This template is not available yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>slug: {slug}</p>
      </div>
    </div>
  );
}

/**
 * Renders the template registered for `slug`, falling back to a friendly
 * placeholder when a template row references a component that isn't built.
 */
export function TemplateRenderer({
  slug,
  ...props
}: TemplateProps & { slug: string | null | undefined }): ReactElement {
  const Component = getTemplateComponent(slug);
  if (!Component) {
    return <TemplateFallback slug={slug ?? 'unknown'} />;
  }
  return Component(props) as ReactElement;
}
