import { Role } from '@nfc-card/shared';

export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}
