// Global Express type augmentation — extends Request with the authenticated user object
// This allows req.user to be available on all Request objects after authentication middleware

import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        [key: string]: any;
      };
    }
  }
}

export {};
