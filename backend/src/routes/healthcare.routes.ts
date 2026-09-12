import { Router } from 'express';
import { healthcareRepo, notificationRepo } from '../repositories';

const router = Router();

// GET /api/healthcare/requests
router.get('/requests', async (req, res) => {
  const { workerId, status } = req.query;
  const requests = await healthcareRepo.findAllRequests({
    workerId: workerId as string | undefined,
    status: status as string | undefined,
  });
  res.json({ success: true, data: requests });
});

// GET /api/healthcare/requests/:id
router.get('/requests/:id', async (req, res) => {
  const request = await healthcareRepo.findRequestById(req.params.id);
  if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
  res.json({ success: true, data: request });
});

// POST /api/healthcare/requests
router.post('/requests', async (req, res) => {
  const { workerId, workerName, symptoms, description, severity } = req.body;

  if (!workerId || !workerName || !symptoms || !description) {
    return res.status(400).json({ success: false, error: 'Missing required fields: workerId, workerName, symptoms, description' });
  }

  const request = await healthcareRepo.createRequest({
    workerId,
    workerName,
    symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
    description,
    severity: severity || 'MEDIUM',
    status: 'PENDING',
  });

  // Create notification for worker
  await notificationRepo.create({
    userId: workerId,
    type: 'HEALTHCARE_UPDATE' as const,
    category: 'HEALTH',
    title: 'Healthcare Request Submitted',
    message: 'Your healthcare request has been received. A coordinator will contact you soon.',
    isRead: false,
    link: '/healthcare',
  });

  res.status(201).json({ success: true, data: request, message: 'Healthcare request submitted successfully.' });
});

// PUT /api/healthcare/requests/:id
router.put('/requests/:id', async (req, res) => {
  const updated = await healthcareRepo.updateRequest(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Request not found' });
  res.json({ success: true, data: updated });
});

// GET /api/healthcare/camps
router.get('/camps', async (req, res) => {
  const camps = await healthcareRepo.findAllCamps();
  res.json({ success: true, data: camps });
});

// GET /api/healthcare/camps/:id
router.get('/camps/:id', async (req, res) => {
  const camp = await healthcareRepo.findCampById(req.params.id);
  if (!camp) return res.status(404).json({ success: false, error: 'Camp not found' });
  res.json({ success: true, data: camp });
});

// POST /api/healthcare/camps
router.post('/camps', async (req, res) => {
  const camp = await healthcareRepo.createCamp(req.body);
  res.status(201).json({ success: true, data: camp });
});

export default router;
