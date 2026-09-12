// Global Express type augmentation — extends Request with the authenticated user object
// This allows req.user to be available on all Request objects after authentication middleware

import { UserRole } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        phone?: string | null;
        role: UserRole;
        full_name: string;
        name?: string;
        avatar_url?: string | null;
        language_pref?: string;
        is_active?: boolean;
        onboarding_completed?: boolean;
        email_verified?: boolean;
        created_at?: Date | string;
        updated_at?: Date | string;
        [key: string]: any;
      };
    }
  }
}

export {};
