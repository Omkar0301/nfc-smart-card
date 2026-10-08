import type {
  CardStatus,
  CustomerAnalyticsSummary,
  PublicProfileResponse,
  UpdateProfileInput,
  UserProfileResponse,
} from '@nfc-card/shared';
import { apiFetch } from './client';
import { API_ROUTES } from './routes';
import type { ApiResponseEnvelope } from './cardTypes';

export async function getProfile(): Promise<UserProfileResponse> {
  const res = await apiFetch<ApiResponseEnvelope<UserProfileResponse>>(API_ROUTES.profile.get, {
    method: 'GET',
  });
  return res.data;
}

export async function saveProfile(
  data: Record<string, unknown>,
  fieldVisibility: Record<string, boolean>,
  templateId?: string | null
): Promise<UserProfileResponse> {
  const res = await apiFetch<ApiResponseEnvelope<UserProfileResponse>>(API_ROUTES.profile.save, {
    method: 'POST',
    body: JSON.stringify({ data, fieldVisibility, templateId }),
  });
  return res.data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfileResponse> {
  const res = await apiFetch<ApiResponseEnvelope<UserProfileResponse>>(API_ROUTES.profile.update, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function publishProfile(
  data: Record<string, unknown>,
  fieldVisibility: Record<string, boolean>,
  templateId?: string | null
): Promise<UserProfileResponse> {
  return updateProfile({
    data,
    fieldVisibility,
    publish: true,
    templateId,
  });
}

export async function unpublishProfile(): Promise<UserProfileResponse> {
  return updateProfile({
    publish: false,
  });
}

export async function pauseCard(): Promise<{
  card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
}> {
  const res = await apiFetch<
    ApiResponseEnvelope<{
      card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
    }>
  >(API_ROUTES.profile.pause, {
    method: 'POST',
  });
  return res.data;
}

export async function resumeCard(): Promise<{
  card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
}> {
  const res = await apiFetch<
    ApiResponseEnvelope<{
      card: { id: string; cardNumber: string; publicToken: string; status: CardStatus };
    }>
  >(API_ROUTES.profile.resume, {
    method: 'POST',
  });
  return res.data;
}

export async function getProfileAnalytics(): Promise<CustomerAnalyticsSummary> {
  const res = await apiFetch<ApiResponseEnvelope<CustomerAnalyticsSummary>>(
    API_ROUTES.profile.analytics,
    {
      method: 'GET',
    }
  );
  return res.data;
}

export async function getPublicProfile(token: string): Promise<PublicProfileResponse> {
  const res = await apiFetch<ApiResponseEnvelope<PublicProfileResponse>>(
    API_ROUTES.profile.public(token),
    {
      method: 'GET',
    }
  );
  return res.data;
}
