import type { FieldSchema } from './types/fieldSchema.js';

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

  // Card Type & Field Schema (F-004)
  SLUG_EXISTS = 'SLUG_EXISTS',
  INVALID_SLUG = 'INVALID_SLUG',
  INVALID_FIELD_TYPE = 'INVALID_FIELD_TYPE',
  DUPLICATE_FIELD_KEY = 'DUPLICATE_FIELD_KEY',

  // Bulk Card Generation (F-005)
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  CARD_TYPE_NOT_FOUND = 'CARD_TYPE_NOT_FOUND',
  CARD_TYPE_INACTIVE = 'CARD_TYPE_INACTIVE',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  BATCH_NOT_FOUND = 'BATCH_NOT_FOUND',

  // Admin Card Lifecycle & Inventory (F-006)
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  REPLACEMENT_NOT_AVAILABLE = 'REPLACEMENT_NOT_AVAILABLE',
  CARD_TYPE_MISMATCH = 'CARD_TYPE_MISMATCH',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_HAS_CARD = 'USER_ALREADY_HAS_CARD',
  CARD_DEACTIVATED_PERMANENT = 'CARD_DEACTIVATED_PERMANENT',
  ACTIVE_ASSIGNMENT_NOT_FOUND = 'ACTIVE_ASSIGNMENT_NOT_FOUND',

  // Card Claiming & Activation (F-007)
  CARD_NOT_AVAILABLE = 'CARD_NOT_AVAILABLE',
  CARD_ALREADY_CLAIMED = 'CARD_ALREADY_CLAIMED',

  // Profile Management (F-008)
  NO_ACTIVE_CARD = 'NO_ACTIVE_CARD',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  CARD_PAUSED = 'CARD_PAUSED',
  CARD_SUSPENDED = 'CARD_SUSPENDED',

  // Template System (F-009)
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_SLUG_EXISTS = 'TEMPLATE_SLUG_EXISTS',
  TEMPLATE_IN_USE = 'TEMPLATE_IN_USE',
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

export type GenerationJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface GenerationJob {
  id: string;
  batchId: string;
  cardTypeId: string;
  requestedBy: string;
  quantity: number;
  generated: number;
  status: GenerationJobStatus | string;
  startedAt: Date | string | null;
  completedAt: Date | string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CardTypeSummary {
  id: string;
  name: string;
  slug: string;
  cardNumberPrefix?: string;
  status?: string;
}

export interface AssignedUserSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status?: string;
}

export interface CardAssignmentItem {
  id: string;
  cardId: string;
  userId: string;
  status: string;
  assignedAt: Date | string;
  unassignedAt: Date | string | null;
  user: AssignedUserSummary;
}

export interface CardInventoryItem {
  id: string;
  cardNumber: string;
  publicToken: string;
  batchId: string | null;
  status: CardStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  cardType: CardTypeSummary;
  assignments: CardAssignmentItem[];
  activeAssignment?: CardAssignmentItem | null;
}

export interface ProfileEventItem {
  id: string;
  cardId: string;
  profileId: string | null;
  eventType: string;
  timestamp: Date | string;
}

export interface CardDetail {
  id: string;
  cardNumber: string;
  publicToken: string;
  batchId: string | null;
  status: CardStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  cardType: CardTypeSummary;
  assignments: CardAssignmentItem[];
  events: ProfileEventItem[];
}

export interface PublicCardLookupResponse {
  status: CardStatus;
  cardType?: {
    slug: string;
    name: string;
  };
  publicToken?: string;
}

export interface ClaimCardResponse {
  card: {
    id: string;
    cardNumber: string;
    publicToken: string;
    status: CardStatus;
  };
  profile: {
    id: string;
    cardTypeId: string;
    status: string;
  };
  assignment: {
    id: string;
  };
}

export type ProfileStatus = 'draft' | 'published';

export interface UserProfileResponse {
  profile: {
    id: string;
    userId: string;
    cardTypeId: string;
    templateId?: string | null;
    data: Record<string, any>;
    fieldVisibility: Record<string, boolean>;
    status: ProfileStatus;
    cardType: {
      id: string;
      name: string;
      slug: string;
      fieldSchema: any[];
    };
    card: {
      id: string;
      cardNumber: string;
      publicToken: string;
      status: CardStatus;
    };
  };
}

export interface UpdateProfileInput {
  data?: Record<string, any>;
  fieldVisibility?: Record<string, boolean>;
  publish?: boolean;
  templateId?: string | null;
}

export interface PublicProfileResponse {
  card: {
    cardNumber: string;
    status: CardStatus;
    publicToken: string;
  };
  cardType: {
    slug: string;
    name: string;
    fieldSchema?: FieldSchema;
  };
  profile?: {
    id: string;
    data: Record<string, any>;
    templateId?: string | null;
    template?: {
      id: string;
      name: string;
      slug: string;
      configuration?: Record<string, any>;
    } | null;
    status: string;
  };
  profileStatus?: string;
}
