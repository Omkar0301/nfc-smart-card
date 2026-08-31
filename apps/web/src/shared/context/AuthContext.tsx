'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Role, UserStatus, type AuthUser } from '@nfc-card/shared';
import { ApiError, setAccessToken, setRefreshToken, tryRefresh } from '../api/client';
import * as authApi from '../api/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  sendOtp: (phone: string) => ReturnType<typeof authApi.sendOtp>;
  login: (phone: string, code: string) => Promise<AuthUser>;
  loginWithRecovery: (token: string) => Promise<AuthUser>;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restore = useCallback(async () => {
    try {
      const refreshed = await tryRefresh();
      if (!refreshed) {
        setUser(null);
        return;
      }
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const login = useCallback(async (phone: string, code: string) => {
    const session = await authApi.verifyOtp(phone, code);
    const me: AuthUser = {
      id: session.user.id,
      name: session.user.name,
      phone: session.user.phone,
      email: null,
      role: session.user.role,
      status: UserStatus.ACTIVE,
    };
    try {
      const full = await authApi.getMe();
      setUser(full);
      return full;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      setUser(me);
      return me;
    }
  }, []);

  const loginWithRecovery = useCallback(async (token: string) => {
    const session = await authApi.verifyRecovery(token);
    const me: AuthUser = {
      id: session.user.id,
      name: session.user.name,
      phone: session.user.phone,
      email: null,
      role: session.user.role,
      status: UserStatus.ACTIVE,
    };
    try {
      const full = await authApi.getMe();
      setUser(full);
      return full;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      setUser(me);
      return me;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const full = await authApi.getMe();
      setUser(full);
      return full;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAdmin: user?.role === Role.ADMIN,
      sendOtp: authApi.sendOtp,
      login,
      loginWithRecovery,
      refreshUser,
      logout,
    }),
    [user, isLoading, login, loginWithRecovery, refreshUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
