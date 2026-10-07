import { ErrorCode, type AuthUser, type Role } from '@nfc-card/shared';
import {
  ApiError,
  apiFetch,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  tryRefresh,
} from './client';
import { API_ROUTES } from './routes';
import type { ApiResponseEnvelope } from './cardTypes';

export type SessionUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
};

export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export async function sendOtp(phone: string): Promise<void> {
  await apiFetch<ApiResponseEnvelope<unknown>>(API_ROUTES.auth.sendOtp, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const res = await apiFetch<ApiResponseEnvelope<VerifyOtpResponse>>(API_ROUTES.auth.verifyOtp, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone, code }),
  });
  const data = res.data;
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function refresh(): Promise<{ accessToken: string }> {
  const ok = await tryRefresh();
  if (!ok) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Refresh failed');
  }
  const token = getAccessToken();
  if (!token) {
    throw new ApiError(401, ErrorCode.UNAUTHORIZED, 'Refresh failed');
  }
  return { accessToken: token };
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<ApiResponseEnvelope<{ loggedOut: boolean }>>(API_ROUTES.auth.logout, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiFetch<ApiResponseEnvelope<AuthUser>>(API_ROUTES.auth.me);
  return res.data;
}

export async function requestRecovery(email: string): Promise<{ message: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ message: string }>>(
    API_ROUTES.auth.recoverRequest,
    {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
      body: JSON.stringify({ email }),
    }
  );
  return res.data;
}

export async function verifyRecovery(token: string): Promise<VerifyOtpResponse> {
  const res = await apiFetch<ApiResponseEnvelope<VerifyOtpResponse>>(
    API_ROUTES.auth.recoverVerify,
    {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
      body: JSON.stringify({ token }),
    }
  );
  const data = res.data;
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function updateRecoveryPhone(phone: string, code: string): Promise<{ phone: string }> {
  const res = await apiFetch<ApiResponseEnvelope<{ phone: string }>>(API_ROUTES.auth.recoverPhone, {
    method: 'PUT',
    body: JSON.stringify({ phone, code }),
  });
  return res.data;
}

export async function updateRecoveryEmail(email: string | null): Promise<{ email: string | null }> {
  const res = await apiFetch<ApiResponseEnvelope<{ email: string | null }>>(
    API_ROUTES.auth.updateEmail,
    {
      method: 'PUT',
      body: JSON.stringify({ email }),
    }
  );
  return res.data;
}
