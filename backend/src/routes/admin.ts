import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// List users — parameterized role filter (fixes SQL injection from Phase 1)
router.get('/users', async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
  const offset = (page - 1) * limit;
  const role = req.query.role as string | undefined;

  const validRoles = ['AGARIYA_WORKER', 'BUYER', 'COORDINATOR', 'ADMIN'];
  const params: unknown[] = [limit, offset];
  let where = '';
  if (role && validRoles.includes(role)) {
    where = 'WHERE role = $3';
    params.push(role);
  }

  const result = await query(
    `SELECT id, email, phone, role, full_name, avatar_url, language_pref,
            is_active, onboarding_completed, created_at
     FROM users ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    params
  );
  const countParams = role && validRoles.includes(role) ? [role] : [];
  const countWhere  = role && validRoles.includes(role) ? 'WHERE role = $1' : '';
  const count = await query(`SELECT COUNT(*) FROM users ${countWhere}`, countParams);
  res.json({
    success: true,
    data: {
      users: result.rows,
      total: parseInt(count.rows[0].count),
      page,
      pages: Math.ceil(parseInt(count.rows[0].count) / limit),
    },
  });
});

// Deactivate user
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  const { id } = req.params;
  await query(`UPDATE users SET is_active = false WHERE id = $1`, [id]);
  res.json({ success: true });
});

// Reactivate user
router.patch('/users/:id/activate', async (req: Request, res: Response) => {
  const { id } = req.params;
  await query(`UPDATE users SET is_active = true WHERE id = $1`, [id]);
  res.json({ success: true });
});

// Audit logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '50'), 200);
  const result = await query(
    `SELECT al.*, u.email, u.full_name FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json({ success: true, data: result.rows });
});

export default router;
