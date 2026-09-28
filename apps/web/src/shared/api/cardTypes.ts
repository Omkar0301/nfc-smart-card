import type { CardType, FieldSchemaItem } from '@nfc-card/shared';
import { apiFetch } from './client';
import { API_ROUTES } from './routes';

export interface CreateCardTypePayload {
  name: string;
  slug: string;
  description?: string | null;
  fieldSchema: FieldSchemaItem[];
}

export interface UpdateCardTypePayload {
  name?: string;
  description?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  fieldSchema?: FieldSchemaItem[];
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function listCardTypes(): Promise<CardType[]> {
  const res = await apiFetch<ApiResponseEnvelope<{ cardTypes: CardType[] }>>(
    API_ROUTES.admin.cardTypes
  );
  return res.data.cardTypes;
}

export async function getCardType(id: string): Promise<CardType> {
  const res = await apiFetch<ApiResponseEnvelope<{ cardType: CardType }>>(
    `${API_ROUTES.admin.cardTypes}/${id}`
  );
  return res.data.cardType;
}

export async function createCardType(payload: CreateCardTypePayload): Promise<CardType> {
  const res = await apiFetch<ApiResponseEnvelope<{ cardType: CardType }>>(
    API_ROUTES.admin.cardTypes,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return res.data.cardType;
}

export async function updateCardType(
  id: string,
  payload: UpdateCardTypePayload
): Promise<{ cardType: CardType; warning?: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ cardType: CardType; warning?: string }>>(
    `${API_ROUTES.admin.cardTypes}/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}
