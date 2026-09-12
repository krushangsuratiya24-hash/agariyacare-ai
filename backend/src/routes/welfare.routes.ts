import { Router } from 'express';
import { welfareRepo, workerRepo } from '../repositories';
import { WelfareAgent } from '../agents/welfare.agent';

const router = Router();
const welfareAgent = new WelfareAgent();

// GET /api/welfare/schemes
router.get('/schemes', async (req, res) => {
  const schemes = await welfareRepo.findAllSchemes(true);
  res.json({
    success: true,
    data: schemes,
    disclaimer: 'Eligibility information is illustrative development data. Verify with official government portals.',
  });
});

// GET /api/welfare/schemes/:id
router.get('/schemes/:id', async (req, res) => {
  const scheme = await welfareRepo.findSchemeById(req.params.id);
  if (!scheme) return res.status(404).json({ success: false, error: 'Scheme not found' });
  res.json({ success: true, data: scheme });
});

// POST /api/welfare/match
router.post('/match', async (req, res) => {
  const { workerId } = req.body;
  if (!workerId) return res.status(400).json({ success: false, error: 'workerId is required' });

  const worker = await workerRepo.findById(workerId);
  if (!worker) return res.status(404).json({ success: false, error: 'Worker not found' });

  const schemes = await welfareRepo.findAllSchemes(true);
  const matches = welfareAgent.matchSchemes(worker, schemes);

  res.json({
    success: true,
    data: matches,
    disclaimer: 'Eligibility information is illustrative. Verify with official government portals before applying.',
  });
});

export default router;
