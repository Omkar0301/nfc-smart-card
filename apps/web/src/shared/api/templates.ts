import type { TemplateSummary } from '@nfc-card/shared';
import { apiFetch } from './client';
import { API_ROUTES } from './routes';
import type { ApiResponseEnvelope } from './cardTypes';

export interface CreateTemplatePayload {
  cardTypeId: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  isActive?: boolean;
  isPremium?: boolean;
  sortOrder?: number;
  configuration?: Record<string, unknown>;
}

export interface UpdateTemplatePayload {
  name?: string;
  thumbnail?: string | null;
  isActive?: boolean;
  isPremium?: boolean;
  sortOrder?: number;
  configuration?: Record<string, unknown>;
}

export interface DeleteTemplateResult {
  template: TemplateSummary;
  deactivated: boolean;
  warning?: string;
}

/** Public template library for a card type (no auth required). */
export async function listTemplates(cardType: string): Promise<TemplateSummary[]> {
  const res = await apiFetch<ApiResponseEnvelope<{ templates: TemplateSummary[] }>>(
    API_ROUTES.templates.list(cardType),
    { skipAuth: true }
  );
  return res.data.templates;
}

/** Admin — all templates, including inactive ones, across every card type. */
export async function listAllTemplates(): Promise<TemplateSummary[]> {
  const res = await apiFetch<ApiResponseEnvelope<{ templates: TemplateSummary[] }>>(
    API_ROUTES.admin.templates.list
  );
  return res.data.templates;
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<TemplateSummary> {
  const res = await apiFetch<ApiResponseEnvelope<{ template: TemplateSummary }>>(
    API_ROUTES.admin.templates.create,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.data.template;
}

export async function updateTemplate(
  id: string,
  payload: UpdateTemplatePayload
): Promise<TemplateSummary> {
  const res = await apiFetch<ApiResponseEnvelope<{ template: TemplateSummary }>>(
    API_ROUTES.admin.templates.update(id),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.data.template;
}

export async function deleteTemplate(id: string): Promise<DeleteTemplateResult> {
  const res = await apiFetch<ApiResponseEnvelope<DeleteTemplateResult>>(
    API_ROUTES.admin.templates.remove(id),
    { method: 'DELETE' }
  );
  return res.data;
}
