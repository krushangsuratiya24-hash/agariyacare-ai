import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { signToken, setCookieToken, clearCookieToken } from '../utils/jwt';
import { UserRole } from '../types';

// ─── Validation rules ─────────────────────────────────────────────────────────

export const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name required (2-255 chars)'),
  body('role')
    .isIn(['AGARIYA_WORKER', 'BUYER', 'COORDINATOR'])
    .withMessage('Role must be AGARIYA_WORKER, BUYER, or COORDINATOR'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('language_pref').optional().isIn(['en', 'gu']).withMessage('Language must be en or gu'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const signup = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password, full_name, role, phone, language_pref = 'en' } = req.body;

  try {
    // Check existing user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, phone, password_hash, role, full_name, language_pref)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, phone, role, full_name, avatar_url, language_pref,
                 is_active, onboarding_completed, email_verified, created_at, updated_at`,
      [email, phone || null, password_hash, role as UserRole, full_name, language_pref]
    );

    const user = result.rows[0];

    // Create role-specific profile stub
    if (role === 'AGARIYA_WORKER') {
      await query(
        'INSERT INTO worker_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    } else if (role === 'BUYER') {
      await query(
        'INSERT INTO buyer_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'SIGNUP', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    setCookieToken(res, token);

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const result = await query(
      `SELECT id, email, phone, password_hash, role, full_name, avatar_url,
              language_pref, is_active, onboarding_completed, email_verified,
              created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account is deactivated' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGIN', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );

    const { password_hash: _, ...publicUser } = user;
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    setCookieToken(res, token);

    res.json({
      success: true,
      data: { user: publicUser, token },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGOUT', $2, $3)`,
      [req.user.id, req.ip, req.headers['user-agent']]
    ).catch(() => {});
  }
  clearCookieToken(res);
  res.json({ success: true, message: 'Logged out' });
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, data: { user: req.user } });
};
