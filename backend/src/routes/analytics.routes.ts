import { Router } from 'express';
import { safetyRepo, healthcareRepo, communityRepo, workerRepo, marketPriceRepo } from '../repositories';

const router = Router();

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  const [workers, healthRequests, safetyIncidents, safetyAlerts, supportRequests] = await Promise.all([
    workerRepo.findAll(),
    healthcareRepo.findAllRequests(),
    safetyRepo.findIncidents(),
    safetyRepo.findActiveAlerts(),
    communityRepo.findAllSupportRequests(),
  ]);

  const activeWorkers = workers.filter(w => w.role === 'worker');

  res.json({
    success: true,
    data: {
      totalWorkers: activeWorkers.length,
      activeAlerts: safetyAlerts.length,
      pendingHealthcareRequests: healthRequests.filter(r => r.status === 'PENDING').length,
      totalHealthcareRequests: healthRequests.length,
      openSupportRequests: supportRequests.filter(r => r.status === 'OPEN').length,
      totalIncidents: safetyIncidents.length,
    },
    note: 'Development Platform Metrics',
  });
});

// GET /api/analytics/safety
router.get('/safety', async (req, res) => {
  const incidents = await safetyRepo.findIncidents();
  const readings = await safetyRepo.findReadings();

  const byType = incidents.reduce((acc: Record<string, number>, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  const byLevel = readings.reduce((acc: Record<string, number>, r) => {
    acc[r.safetyLevel] = (acc[r.safetyLevel] || 0) + 1;
    return acc;
  }, {});

  res.json({ success: true, data: { incidents: byType, readingsByLevel: byLevel, total: incidents.length } });
});

// GET /api/analytics/healthcare
router.get('/healthcare', async (req, res) => {
  const requests = await healthcareRepo.findAllRequests();

  const byStatus = requests.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const bySeverity = requests.reduce((acc: Record<string, number>, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {});

  res.json({ success: true, data: { byStatus, bySeverity, total: requests.length } });
});

// GET /api/analytics/market
router.get('/market', async (req, res) => {
  const trend = await marketPriceRepo.getPriceTrend(7);
  res.json({ success: true, data: trend, note: 'Development reference data — not official market prices' });
});

export default router;
