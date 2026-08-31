export enum CardStatus {
  AVAILABLE = "AVAILABLE",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  LOST = "LOST",
  REPLACED = "REPLACED"
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
