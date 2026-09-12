import { Router } from 'express';
import { notificationRepo } from '../repositories';

const router = Router();

// GET /api/notifications/:userId
router.get('/:userId', async (req, res) => {
  const notifications = await notificationRepo.findByUserId(req.params.userId);
  res.json({ success: true, data: notifications });
});

// GET /api/notifications/:userId/unread
router.get('/:userId/unread', async (req, res) => {
  const notifications = await notificationRepo.findUnreadByUserId(req.params.userId);
  res.json({ success: true, data: notifications, count: notifications.length });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  const success = await notificationRepo.markAsRead(req.params.id);
  if (!success) return res.status(404).json({ success: false, error: 'Notification not found' });
  res.json({ success: true });
});

// PUT /api/notifications/user/:userId/read-all
router.put('/user/:userId/read-all', async (req, res) => {
  await notificationRepo.markAllAsRead(req.params.userId);
  res.json({ success: true });
});

export default router;
