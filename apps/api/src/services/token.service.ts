import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { ErrorCode, Role } from '@nfc-card/shared';
import { config } from '../config.js';
import { tokenRepository } from '../repositories/token.repository.js';

const ACCESS_EXPIRES: SignOptions['expiresIn'] = '15m';
const REFRESH_EXPIRES: SignOptions['expiresIn'] = '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_COOKIE = 'refreshToken';

type AccessPayload = {
  sub: string;
  role: Role;
  typ: 'access';
};

type RefreshPayload = {
  sub: string;
  jti: string;
  typ: 'refresh';
};

function accessSecret(): string {
  return config.JWT_SECRET;
}

function refreshSecret(): string {
  return config.JWT_REFRESH_SECRET;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessPayload = { sub: userId, role, typ: 'access' };
  return jwt.sign(payload, accessSecret(), { expiresIn: ACCESS_EXPIRES });
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const row = await tokenRepository.createPending(userId, new Date(Date.now() + REFRESH_TTL_MS));

  const payload: RefreshPayload = { sub: userId, jti: row.id, typ: 'refresh' };
  const token = jwt.sign(payload, refreshSecret(), { expiresIn: REFRESH_EXPIRES });

  await tokenRepository.updateHash(row.id, hashToken(token));

  return token;
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_MS,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: 0 });
}

export type AccessVerifyResult =
  | { ok: true; userId: string; role: Role }
  | { ok: false; code: ErrorCode.TOKEN_EXPIRED | ErrorCode.UNAUTHORIZED };

export function verifyAccessToken(token: string): AccessVerifyResult {
  try {
    const decoded = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
    if (
      decoded.typ !== 'access' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.role !== 'string'
    ) {
      return { ok: false, code: ErrorCode.UNAUTHORIZED };
    }
    if (decoded.role !== Role.ADMIN && decoded.role !== Role.CUSTOMER) {
      return { ok: false, code: ErrorCode.UNAUTHORIZED };
    }
    return { ok: true, userId: decoded.sub, role: decoded.role };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { ok: false, code: ErrorCode.TOKEN_EXPIRED };
    }
    return { ok: false, code: ErrorCode.UNAUTHORIZED };
  }
}

export type RefreshLookupResult =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; code: ErrorCode.UNAUTHORIZED | ErrorCode.TOKEN_EXPIRED };

export async function verifyStoredRefreshToken(token: string): Promise<RefreshLookupResult> {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, refreshSecret()) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { ok: false, code: ErrorCode.TOKEN_EXPIRED };
    }
    return { ok: false, code: ErrorCode.UNAUTHORIZED };
  }

  if (
    decoded.typ !== 'refresh' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.jti !== 'string'
  ) {
    return { ok: false, code: ErrorCode.UNAUTHORIZED };
  }

  const row = await tokenRepository.findById(decoded.jti);
  if (!row || row.userId !== decoded.sub || row.revokedAt) {
    return { ok: false, code: ErrorCode.UNAUTHORIZED };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: ErrorCode.TOKEN_EXPIRED };
  }
  if (row.tokenHash !== hashToken(token)) {
  }

  return { ok: true, userId: row.userId, tokenId: row.id };
}

export async function revokeRefreshTokenById(tokenId: string): Promise<void> {
  await tokenRepository.revokeById(tokenId);
}

export async function rotateRefreshToken(userId: string, previousTokenId: string): Promise<string> {
  await revokeRefreshTokenById(previousTokenId);
  return issueRefreshToken(userId);
}
