import { Router } from 'express';
import { safetyRepo, notificationRepo } from '../repositories';
import { SafetyAgent } from '../agents/safety.agent';

const router = Router();

// GET /api/safety/readings
router.get('/readings', async (req, res) => {
  const { workerId } = req.query;
  const readings = await safetyRepo.findReadings(workerId as string | undefined);
  res.json({ success: true, data: readings });
});

// POST /api/safety/readings
router.post('/readings', async (req, res) => {
  const { workerId, temperature, humidity, workingDurationHours, waterAvailability, restBreaksTaken } = req.body;

  if (temperature == null || humidity == null) {
    return res.status(400).json({ success: false, error: 'temperature and humidity are required' });
  }

  const { level, heatIndex, recommendations } = SafetyAgent.calculateSafetyLevel(
    temperature,
    humidity,
    workingDurationHours ?? 0,
    waterAvailability ?? 'SUFFICIENT',
    restBreaksTaken ?? 0
  );

  const reading = await safetyRepo.createReading({
    workerId,
    temperature,
    humidity,
    heatIndex,
    workingDurationHours: workingDurationHours ?? 0,
    waterAvailability: waterAvailability ?? 'SUFFICIENT',
    restBreaksTaken: restBreaksTaken ?? 0,
    safetyLevel: level,
    timestamp: new Date().toISOString(),
    source: 'MANUAL',
  });

  // Auto-create alert if HIGH_RISK or EMERGENCY
  if (level === 'HIGH_RISK' || level === 'EMERGENCY') {
    await safetyRepo.createAlert({
      type: level,
      message: `${level === 'EMERGENCY' ? '🚨 EMERGENCY' : '⚠️ HIGH RISK'}: Heat index ${heatIndex}°C recorded. ${recommendations[0]}`,
      affectedArea: 'Salt Pan Area',
      isActive: true,
    });

    if (workerId) {
      await notificationRepo.create({
        userId: workerId,
        type: 'SAFETY_ALERT' as const,
        category: 'SAFETY',
        title: `${level} Safety Alert`,
        message: recommendations[0],
        isRead: false,
        link: '/safety',
      });
    }
  }

  res.status(201).json({ success: true, data: { reading, recommendations, safetyLevel: level } });
});

// GET /api/safety/incidents
router.get('/incidents', async (req, res) => {
  const { workerId, status } = req.query;
  const incidents = await safetyRepo.findIncidents({
    workerId: workerId as string | undefined,
    status: status as string | undefined,
  });
  res.json({ success: true, data: incidents });
});

// POST /api/safety/incidents
router.post('/incidents', async (req, res) => {
  const { workerId, workerName, type, description, severity, location } = req.body;

  if (!workerId || !workerName || !type || !description) {
    return res.status(400).json({ success: false, error: 'workerId, workerName, type, and description are required' });
  }

  const incident = await safetyRepo.createIncident({
    workerId,
    workerName,
    type,
    description,
    severity: severity || 'CAUTION',
    location: location || 'Salt Pan Area',
    status: 'REPORTED',
  });

  // Notify worker
  await notificationRepo.create({
    userId: workerId,
    type: 'SAFETY_ALERT' as const,
    category: 'SAFETY',
    title: 'Safety Incident Reported',
    message: 'Your safety incident report has been submitted. A coordinator will follow up.',
    isRead: false,
    link: '/safety',
  });

  res.status(201).json({ success: true, data: incident, message: 'Safety incident reported successfully.' });
});

// PUT /api/safety/incidents/:id
router.put('/incidents/:id', async (req, res) => {
  const updated = await safetyRepo.updateIncident(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Incident not found' });
  res.json({ success: true, data: updated });
});

// GET /api/safety/alerts
router.get('/alerts', async (req, res) => {
  const alerts = await safetyRepo.findActiveAlerts();
  res.json({ success: true, data: alerts });
});

export default router;
