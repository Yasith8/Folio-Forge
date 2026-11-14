import type { PublicUser } from '@folioforge/shared';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionToken?: string;
    }
  }
}

export {};
