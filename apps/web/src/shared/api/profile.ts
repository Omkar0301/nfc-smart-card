import type {
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

export async function getPublicProfile(token: string): Promise<PublicProfileResponse> {
  const res = await apiFetch<ApiResponseEnvelope<PublicProfileResponse>>(
    API_ROUTES.profile.public(token),
    {
      method: 'GET',
    }
  );
  return res.data;
}
