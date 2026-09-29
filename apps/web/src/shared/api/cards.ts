import type {
  CardDetail,
  CardInventoryItem,
  ClaimCardResponse,
  GenerationJob,
  PublicCardLookupResponse,
} from '@nfc-card/shared';
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

export interface ListCardsFilters {
  cardTypeId?: string;
  status?: string;
  batchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListCardsResponse {
  cards: CardInventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AvailableReplacementCard {
  id: string;
  cardNumber: string;
  publicToken: string;
  batchId: string | null;
  status: string;
  createdAt: string;
}

export interface SearchUserItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
}

export async function listCards(filters?: ListCardsFilters): Promise<ListCardsResponse> {
  const params = new URLSearchParams();
  if (filters?.cardTypeId) params.set('cardTypeId', filters.cardTypeId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.batchId) params.set('batchId', filters.batchId);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const endpoint = `${API_ROUTES.admin.cards.list}${query ? `?${query}` : ''}`;
  const res = await apiFetch<ApiResponseEnvelope<ListCardsResponse>>(endpoint);
  return res.data;
}

export async function getCardDetail(id: string): Promise<CardDetail> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: CardDetail }>>(
    API_ROUTES.admin.cards.detail(id)
  );
  return res.data.card;
}

export async function assignCard(
  id: string,
  userId: string
): Promise<{ card: any; assignment: any; message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: any; assignment: any; message: string }>>(
    API_ROUTES.admin.cards.assign(id),
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }
  );
  return res.data;
}

export async function activateCard(id: string): Promise<{ card: any; message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: any; message: string }>>(
    API_ROUTES.admin.cards.activate(id),
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  return res.data;
}

export async function suspendCard(
  id: string,
  reason?: string
): Promise<{ card: any; reason?: string; message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: any; reason?: string; message: string }>>(
    API_ROUTES.admin.cards.suspend(id),
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
  return res.data;
}

export async function unsuspendCard(id: string): Promise<{ card: any; message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: any; message: string }>>(
    API_ROUTES.admin.cards.unsuspend(id),
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  return res.data;
}

export async function deactivateCard(
  id: string,
  reason?: string
): Promise<{ card: any; reason?: string; message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ card: any; reason?: string; message: string }>>(
    API_ROUTES.admin.cards.deactivate(id),
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
  return res.data;
}

export async function replaceCard(
  id: string,
  replacementCardId: string
): Promise<{
  oldCard: any;
  newCard: any;
  assignment: any;
  message: string;
}> {
  const res = await apiFetch<
    ApiResponseEnvelope<{
      oldCard: any;
      newCard: any;
      assignment: any;
      message: string;
    }>
  >(API_ROUTES.admin.cards.replace(id), {
    method: 'POST',
    body: JSON.stringify({ replacementCardId }),
  });
  return res.data;
}

export async function getAvailableReplacements(
  cardTypeId: string,
  excludeCardId?: string,
  search?: string
): Promise<AvailableReplacementCard[]> {
  const params = new URLSearchParams();
  params.set('cardTypeId', cardTypeId);
  if (excludeCardId) params.set('excludeCardId', excludeCardId);
  if (search) params.set('search', search);

  const res = await apiFetch<ApiResponseEnvelope<{ cards: AvailableReplacementCard[] }>>(
    `${API_ROUTES.admin.cards.replacements}?${params.toString()}`
  );
  return res.data.cards;
}

export async function searchUsers(query: string): Promise<SearchUserItem[]> {
  const params = new URLSearchParams({ query });
  const res = await apiFetch<ApiResponseEnvelope<{ users: SearchUserItem[] }>>(
    `${API_ROUTES.admin.cards.searchUsers}?${params.toString()}`
  );
  return res.data.users;
}

export async function getCardByToken(token: string): Promise<PublicCardLookupResponse> {
  const res = await apiFetch<ApiResponseEnvelope<PublicCardLookupResponse>>(
    API_ROUTES.cards.lookup(token)
  );
  return res.data;
}

export async function claimCard(token: string): Promise<ClaimCardResponse> {
  const res = await apiFetch<ApiResponseEnvelope<ClaimCardResponse>>(
    API_ROUTES.cards.claim(token),
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
  return res.data;
}
