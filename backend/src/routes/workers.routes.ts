import { Router, Request, Response } from 'express';
import { workerRepo } from '../repositories';
import { ApiResponse, Worker } from '../types';

const router = Router();

// GET /api/workers
router.get('/', async (req, res) => {
  const workers = await workerRepo.findAll();
  const resp: ApiResponse<Worker[]> = { success: true, data: workers };
  res.json(resp);
});

// GET /api/workers/:id
router.get('/:id', async (req, res) => {
  const worker = await workerRepo.findById(req.params.id);
  if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });
  res.json({ success: true, data: worker });
});

// PUT /api/workers/:id
router.put('/:id', async (req, res) => {
  const updated = await workerRepo.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Worker not found' });
  res.json({ success: true, data: updated });
});

export default router;
