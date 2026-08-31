import type { AuthUser, Role } from "@nfc-card/shared";
import { apiFetch, setAccessToken, setRefreshToken } from "./client";

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
  return apiFetch("/auth/send-otp", {
    method: "POST",
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const data = await apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
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
  return apiFetch("/auth/refresh", {
    method: "POST",
    skipAuth: true,
    skipRefresh: true,
    body: JSON.stringify({}),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
  }
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch("/auth/me");
}
