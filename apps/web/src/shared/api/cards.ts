import type { GenerationJob } from '@nfc-card/shared';
import { apiFetch, getAccessToken } from './client';
import { API_ROUTES } from './routes';
import type { ApiResponseEnvelope } from './cardTypes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface GenerateCardsPayload {
  cardTypeId: string;
  quantity: number;
}

export interface GenerateCardsResponse {
  jobId: string;
  batchId: string;
  message: string;
}

export interface BatchInvalidateResponse {
  invalidated: number;
  skipped: number;
  message: string;
}

export async function generateCards(payload: GenerateCardsPayload): Promise<GenerateCardsResponse> {
  const res = await apiFetch<ApiResponseEnvelope<GenerateCardsResponse>>(
    API_ROUTES.admin.cards.generate,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

export async function getJobStatus(id: string): Promise<GenerationJob> {
  const res = await apiFetch<ApiResponseEnvelope<{ job: GenerationJob }>>(
    API_ROUTES.admin.cards.jobStatus(id)
  );
  return res.data.job;
}

export async function listRecentJobs(): Promise<GenerationJob[]> {
  const res = await apiFetch<ApiResponseEnvelope<{ jobs: GenerationJob[] }>>(
    API_ROUTES.admin.cards.jobs
  );
  return res.data.jobs;
}

export async function invalidateBatch(batchId: string): Promise<BatchInvalidateResponse> {
  const res = await apiFetch<ApiResponseEnvelope<BatchInvalidateResponse>>(
    API_ROUTES.admin.cards.invalidateBatch(batchId),
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  return res.data;
}

export function getExportCardsUrl(filters?: {
  cardTypeId?: string;
  status?: string;
  batchId?: string;
}): string {
  const params = new URLSearchParams();
  if (filters?.cardTypeId) params.set('cardTypeId', filters.cardTypeId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.batchId) params.set('batchId', filters.batchId);

  const query = params.toString();
  return `${API_URL}${API_ROUTES.admin.cards.export}${query ? `?${query}` : ''}`;
}

export async function downloadCardsCsv(filters?: {
  cardTypeId?: string;
  status?: string;
  batchId?: string;
}): Promise<void> {
  const url = getExportCardsUrl(filters);
  const token = getAccessToken();

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to export CSV: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `cards-export-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
