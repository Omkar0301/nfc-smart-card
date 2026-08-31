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

export async function sendOtp(phone: string): Promise<{ success: true; message: string }> {
  return apiFetch(API_ROUTES.auth.sendOtp, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const data = await apiFetch<VerifyOtpResponse>(API_ROUTES.auth.verifyOtp, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone, code }),
  });
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
    await apiFetch(API_ROUTES.auth.logout, { method: 'POST', body: JSON.stringify({}) });
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch(API_ROUTES.auth.me);
}

export async function requestRecovery(email: string): Promise<{ message: string }> {
  return apiFetch(API_ROUTES.auth.recoverRequest, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ email }),
  });
}

export async function verifyRecovery(token: string): Promise<VerifyOtpResponse> {
  const data = await apiFetch<VerifyOtpResponse>(API_ROUTES.auth.recoverVerify, {
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ token }),
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function updateRecoveryPhone(
  phone: string,
  code: string
): Promise<{ success: true; phone: string }> {
  return apiFetch(API_ROUTES.auth.recoverPhone, {
    method: 'PUT',
    body: JSON.stringify({ phone, code }),
  });
}

export async function updateRecoveryEmail(
  email: string | null
): Promise<{ success: true; email: string | null }> {
  return apiFetch(API_ROUTES.auth.updateEmail, {
    method: 'PUT',
    body: JSON.stringify({ email }),
  });
}
