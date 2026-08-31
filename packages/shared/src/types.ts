export enum CardStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum ErrorCode {
  // General HTTP & Authentication
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',

  // Phone & OTP
  INVALID_PHONE = 'INVALID_PHONE',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  OTP_LOCKED = 'OTP_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',

  // Tokens & Refresh
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',

  // Account Recovery
  RECOVERY_TOKEN_INVALID = 'RECOVERY_TOKEN_INVALID',
  RECOVERY_TOKEN_EXPIRED = 'RECOVERY_TOKEN_EXPIRED',
  RECOVERY_TOKEN_USED = 'RECOVERY_TOKEN_USED',
  PHONE_IN_USE = 'PHONE_IN_USE',
  EMAIL_IN_USE = 'EMAIL_IN_USE',
}

export type CardTypeCode = 'BUSINESS' | 'COLLEGE';

export interface User {
  id: string;
  phone: string;
  role: Role;
  status: UserStatus;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  status: UserStatus;
}

export interface Card {
  id: string;
  token: string;
  status: CardStatus;
  cardTypeId: string;
  userId?: string;
}
