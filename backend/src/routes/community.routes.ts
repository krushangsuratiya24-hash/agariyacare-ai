import { Router } from 'express';
import { communityRepo, notificationRepo } from '../repositories';

const router = Router();

// GET /api/community/notices
router.get('/notices', async (req, res) => {
  const activeOnly = req.query.active !== 'false';
  const notices = await communityRepo.findAllNotices(activeOnly);
  res.json({ success: true, data: notices });
});

// GET /api/community/notices/:id
router.get('/notices/:id', async (req, res) => {
  const notice = await communityRepo.findNoticeById(req.params.id);
  if (!notice) return res.status(404).json({ success: false, error: 'Notice not found' });
  res.json({ success: true, data: notice });
});

// POST /api/community/notices
router.post('/notices', async (req, res) => {
  const { title, content, category, author } = req.body;
  if (!title || !content || !category || !author) {
    return res.status(400).json({ success: false, error: 'title, content, category and author are required' });
  }
  const notice = await communityRepo.createNotice({ title, content, category, author, isActive: true });
  res.status(201).json({ success: true, data: notice });
});

// PUT /api/community/notices/:id
router.put('/notices/:id', async (req, res) => {
  const updated = await communityRepo.updateNotice(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Notice not found' });
  res.json({ success: true, data: updated });
});

// DELETE /api/community/notices/:id
router.delete('/notices/:id', async (req, res) => {
  const deleted = await communityRepo.deleteNotice(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Notice not found' });
  res.json({ success: true, message: 'Notice removed' });
});

// GET /api/community/support
router.get('/support', async (req, res) => {
  const { workerId, status } = req.query;
  const requests = await communityRepo.findAllSupportRequests({
    workerId: workerId as string | undefined,
    status: status as string | undefined,
  });
  res.json({ success: true, data: requests });
});

// POST /api/community/support
router.post('/support', async (req, res) => {
  const { workerId, workerName, category, subject, description } = req.body;
  if (!workerId || !workerName || !subject || !description) {
    return res.status(400).json({ success: false, error: 'workerId, workerName, subject and description are required' });
  }
  const supportReq = await communityRepo.createSupportRequest({
    workerId, workerName,
    category: category || 'COMMUNITY',
    subject, description,
    status: 'OPEN',
  });

  await notificationRepo.create({
    userId: workerId,
    type: 'COMMUNITY_ANNOUNCEMENT' as const,
    category: 'COMMUNITY',
    title: 'Support Request Submitted',
    message: 'Your support request has been received. A coordinator will respond soon.',
    isRead: false,
    link: '/community',
  });

  res.status(201).json({ success: true, data: supportReq, message: 'Support request submitted successfully.' });
});

// PUT /api/community/support/:id
router.put('/support/:id', async (req, res) => {
  const updated = await communityRepo.updateSupportRequest(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Support request not found' });
  res.json({ success: true, data: updated });
});

export default router;
