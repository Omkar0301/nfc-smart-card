export enum CardStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED"
}

export enum Role {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN"
}

export type CardTypeCode = "BUSINESS" | "COLLEGE";

export interface User {
  id: string;
  phone: string;
  role: Role;
}

export interface Card {
  id: string;
  token: string;
  status: CardStatus;
  cardTypeId: string;
  userId?: string;
}
