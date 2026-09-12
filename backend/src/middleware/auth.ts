import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { query } from '../db/pool';
import { UserRole } from '../types';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const payload = verifyToken(token);
    const result = await query(
      `SELECT id, email, phone, role, full_name, avatar_url, language_pref,
              is_active, onboarding_completed, email_verified, created_at, updated_at
       FROM users WHERE id = $1 AND is_active = true`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'User not found or inactive' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
};
