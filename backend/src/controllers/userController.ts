import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import path from 'path';
import fs from 'fs';

// ─── Validation ────────────────────────────────────────────────────────────────

export const updateProfileValidation = [
  body('full_name').optional().trim().isLength({ min: 2, max: 255 }),
  body('phone').optional({ nullable: true }).isMobilePhone('any'),
  body('language_pref').optional().isIn(['en', 'gu']),
];

export const updateWorkerProfileValidation = [
  body('village').optional().trim().isLength({ max: 255 }),
  body('district').optional().trim().isLength({ max: 255 }),
  body('years_experience').optional().isInt({ min: 0, max: 80 }),
  body('salt_pan_area_acres').optional().isFloat({ min: 0 }),
  body('salt_type').optional().trim().isLength({ max: 100 }),
  body('annual_production_kg').optional().isInt({ min: 0 }),
  body('cooperative_member').optional().isBoolean(),
  body('cooperative_name').optional().trim().isLength({ max: 255 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
];

export const updateBuyerProfileValidation = [
  body('company_name').optional().trim().isLength({ max: 255 }),
  body('business_type').optional().trim().isLength({ max: 100 }),
  body('location').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 255 }),
  body('state').optional().trim().isLength({ max: 255 }),
  body('preferred_salt_type').optional().trim().isLength({ max: 255 }),
  body('monthly_demand_kg').optional().isInt({ min: 0 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const userResult = await query(
      `SELECT id, email, phone, role, full_name, avatar_url, language_pref,
              is_active, onboarding_completed, email_verified, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    let profile = null;
    if (user.role === 'AGARIYA_WORKER') {
      const wp = await query('SELECT * FROM worker_profiles WHERE user_id = $1', [userId]);
      profile = wp.rows[0] || null;
    } else if (user.role === 'BUYER') {
      const bp = await query('SELECT * FROM buyer_profiles WHERE user_id = $1', [userId]);
      profile = bp.rows[0] || null;
    }

    res.json({ success: true, data: { user, profile } });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const userId = req.user!.id;
  const { full_name, phone, language_pref } = req.body;

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); values.push(full_name); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone || null); }
    if (language_pref !== undefined) { updates.push(`language_pref = $${idx++}`); values.push(language_pref); }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, email, phone, role, full_name, avatar_url, language_pref,
                 is_active, onboarding_completed, email_verified, created_at, updated_at`,
      values
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, 'PROFILE_UPDATE', $2)`,
      [userId, req.ip]
    );

    res.json({ success: true, data: { user: result.rows[0] } });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

export const updateWorkerProfile = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const userId = req.user!.id;
  const fields = [
    'village', 'district', 'years_experience', 'salt_pan_area_acres',
    'salt_type', 'annual_production_kg', 'cooperative_member', 'cooperative_name', 'bio',
  ];

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE worker_profiles SET ${updates.join(', ')} WHERE user_id = $${idx}
       RETURNING *`,
      values
    );

    res.json({ success: true, data: { profile: result.rows[0] } });
  } catch (err) {
    console.error('Update worker profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update worker profile' });
  }
};

export const updateBuyerProfile = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const userId = req.user!.id;
  const fields = [
    'company_name', 'business_type', 'location', 'city', 'state',
    'preferred_salt_type', 'monthly_demand_kg', 'bio',
  ];

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE buyer_profiles SET ${updates.join(', ')} WHERE user_id = $${idx}
       RETURNING *`,
      values
    );

    res.json({ success: true, data: { profile: result.rows[0] } });
  } catch (err) {
    console.error('Update buyer profile error:', err);
    res.status(500).json({ success: false, error: 'Failed to update buyer profile' });
  }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  try {
    // Delete old avatar if exists
    const current = await query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    if (current.rows[0]?.avatar_url) {
      const oldPath = path.join(process.cwd(), current.rows[0].avatar_url.replace(/^\/api/, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const result = await query(
      `UPDATE users SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, avatar_url`,
      [avatarUrl, userId]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, 'AVATAR_UPLOAD', $2)`,
      [userId, req.ip]
    );

    res.json({ success: true, data: { avatar_url: result.rows[0].avatar_url } });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
};

export const completeOnboarding = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const result = await query(
      `UPDATE users SET onboarding_completed = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, onboarding_completed`,
      [userId]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, 'ONBOARDING_COMPLETE', $2)`,
      [userId, req.ip]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
  }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50);
  const offset = parseInt((req.query.offset as string) || '0');

  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const countResult = await query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unread_count: parseInt(countResult.rows[0].count),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id } = req.params;

  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark notification' });
  }
};
