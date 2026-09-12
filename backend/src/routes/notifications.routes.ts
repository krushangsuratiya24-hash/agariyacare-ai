import { Router, Request, Response } from 'express';
import { notificationRepo } from '../repositories';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/notifications/:userId — auth required, users can only see their own
router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  // Users can only access their own notifications (coordinators/admins can access any)
  const requestedId = req.params.userId;
  const isPrivileged = authReq.user!.role === 'COORDINATOR' || authReq.user!.role === 'ADMIN';
  if (!isPrivileged && authReq.user!.userId !== requestedId) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  const notifications = await notificationRepo.findByUserId(requestedId);
  res.json({ success: true, data: notifications });
});

// GET /api/notifications/:userId/unread
router.get('/:userId/unread', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const requestedId = req.params.userId;
  const isPrivileged = authReq.user!.role === 'COORDINATOR' || authReq.user!.role === 'ADMIN';
  if (!isPrivileged && authReq.user!.userId !== requestedId) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  const notifications = await notificationRepo.findUnreadByUserId(requestedId);
  res.json({ success: true, data: notifications, count: notifications.length });
});

// PUT /api/notifications/:id/read — auth required
router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const success = await notificationRepo.markAsRead(req.params.id);
  if (!success) return res.status(404).json({ success: false, error: 'Notification not found' });
  res.json({ success: true });
});

// PUT /api/notifications/user/:userId/read-all — auth required
router.put('/user/:userId/read-all', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const requestedId = req.params.userId;
  const isPrivileged = authReq.user!.role === 'COORDINATOR' || authReq.user!.role === 'ADMIN';
  if (!isPrivileged && authReq.user!.userId !== requestedId) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  await notificationRepo.markAllAsRead(requestedId);
  res.json({ success: true });
});

export default router;
