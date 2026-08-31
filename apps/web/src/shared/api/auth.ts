import type { AuthUser, Role } from "@nfc-card/shared";
import { apiFetch, setAccessToken, setRefreshToken } from "./client";
import { API_ROUTES } from "./routes";

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
    method: "POST",
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const data = await apiFetch<VerifyOtpResponse>(API_ROUTES.auth.verifyOtp, {
    method: "POST",
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone, code }),
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function refresh(): Promise<{ accessToken: string }> {
  return apiFetch(API_ROUTES.auth.refresh, {
    method: "POST",
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({}),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch(API_ROUTES.auth.logout, { method: "POST", body: JSON.stringify({}) });
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch(API_ROUTES.auth.me);
}
