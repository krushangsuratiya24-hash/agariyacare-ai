/**
 * Phase 5 — Safety Routes (enhanced)
 *
 * Worker routes:
 *   GET  /api/safety/readings                        — own readings
 *   POST /api/safety/readings                        — submit reading
 *   GET  /api/safety/incidents                       — own incidents
 *   POST /api/safety/incidents                       — report incident
 *   GET  /api/safety/alerts                          — active alerts (public)
 *   GET  /api/safety/assessment                      — current safety assessment for worker
 *
 * Coordinator routes:
 *   GET  /api/safety/coordinator/incidents           — all incidents (filterable)
 *   PUT  /api/safety/coordinator/incidents/:id       — update status/notes
 *   POST /api/safety/coordinator/alerts              — create alert
 *   PUT  /api/safety/coordinator/alerts/:id          — update/deactivate alert
 *
 * Emergency:
 *   POST /api/safety/sos                             — worker triggers SOS
 *   GET  /api/safety/sos                             — worker own SOS events
 *   GET  /api/safety/coordinator/sos                 — coordinator sees all active SOS
 *   PUT  /api/safety/coordinator/sos/:id             — coordinator acknowledges/resolves
 */

import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { safetyRepo, notificationRepo, userRepo, emergencyRepo } from '../repositories';
import { SafetyAgent } from '../agents/safety.agent';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCoordinatorOrAdmin(role: string) {
  return role === 'COORDINATOR' || role === 'ADMIN';
}

async function notifyCoordinatorsOfSafety(
  title: string,
  message: string,
  workerId: string,
  link: string,
  metadata?: Record<string, unknown>
) {
  try {
    const users = await userRepo.findAll();
    const coordinators = users.filter(u => u.role === 'COORDINATOR' || u.role === 'ADMIN');
    for (const coord of coordinators) {
      await notificationRepo.create({
        userId: coord.id,
        type: 'SAFETY_ALERT',
        category: 'SAFETY',
        title,
        message,
        isRead: false,
        link,
        metadata: metadata ?? {},
      } as any);
    }
  } catch (e) {
    console.error('[Safety] Failed to notify coordinators:', e);
  }
}

// ─── Safety Assessment (current status) ──────────────────────────────────────

// GET /api/safety/assessment — returns worker's most recent reading + computed level
router.get('/assessment', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const workerId = authReq.user!.userId;
    const readings = await safetyRepo.findReadings(workerId);
    if (readings.length === 0) {
      return res.json({
        success: true,
        data: {
          hasReading: false,
          safetyLevel: 'CAUTION',
          message: 'No readings submitted yet. Submit a reading to get your current safety assessment.',
        },
      });
    }
    const latest = readings.sort((a, b) =>
      new Date(b.timestamp ?? b.recordedAt ?? '').getTime() - new Date(a.timestamp ?? a.recordedAt ?? '').getTime()
    )[0];
    const { level, heatIndex, recommendations } = SafetyAgent.calculateSafetyLevel(
      latest.temperature, latest.humidity,
      latest.workingDurationHours ?? 0,
      (latest.waterAvailability ?? 'SUFFICIENT') as 'SUFFICIENT' | 'LIMITED' | 'NONE',
      latest.restBreaksTaken ?? 0
    );
    return res.json({
      success: true,
      data: {
        hasReading: true,
        safetyLevel: level,
        heatIndex,
        recommendations,
        reading: latest,
        recordedAt: latest.timestamp ?? latest.recordedAt,
        sourceNote: latest.source === 'MANUAL'
          ? 'Manually submitted reading — not a live sensor.'
          : 'Environmental reading.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to compute safety assessment' });
  }
});

// ─── Readings ─────────────────────────────────────────────────────────────────

// GET /api/safety/readings
router.get('/readings', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const workerId = isCoordinatorOrAdmin(authReq.user!.role)
      ? (req.query.workerId as string | undefined)
      : authReq.user!.userId;
    const readings = await safetyRepo.findReadings(workerId);
    return res.json({ success: true, data: readings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to load readings' });
  }
});

// POST /api/safety/readings
router.post('/readings', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { temperature, humidity, workingDurationHours, waterAvailability, restBreaksTaken } = req.body;

  if (temperature == null || humidity == null) {
    return res.status(400).json({ success: false, error: 'temperature and humidity are required' });
  }
  if (temperature < -10 || temperature > 60 || humidity < 0 || humidity > 100) {
    return res.status(400).json({ success: false, error: 'Invalid temperature or humidity values' });
  }

  const workerId = authReq.user!.userId;

  try {
    const { level, heatIndex, recommendations } = SafetyAgent.calculateSafetyLevel(
      temperature, humidity,
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

    // Auto-alert if dangerous
    if (level === 'HIGH_RISK' || level === 'EMERGENCY') {
      await safetyRepo.createAlert({
        type: level,
        title: level === 'EMERGENCY' ? '🚨 Emergency Heat Conditions' : '⚠️ High Heat Risk',
        message: `Heat index ${heatIndex}°C detected. ${recommendations[0]}`,
        affectedArea: 'Salt Pan Area',
        isActive: true,
        severity: level,
      });

      await notificationRepo.create({
        userId: workerId,
        type: 'SAFETY_ALERT',
        category: 'SAFETY',
        title: `${level === 'EMERGENCY' ? '🚨 EMERGENCY' : '⚠️ HIGH RISK'} Safety Alert`,
        message: recommendations[0],
        isRead: false,
        link: '/safety',
        metadata: { safetyLevel: level, heatIndex },
      } as any);

      await notifyCoordinatorsOfSafety(
        `${level} Alert — Worker Safety`,
        `A worker's reading shows ${level}. Heat index: ${heatIndex}°C. ${recommendations[0]}`,
        workerId,
        '/coordinator/safety',
        { safetyLevel: level, heatIndex, workerId }
      );
    }

    return res.status(201).json({
      success: true,
      data: { reading, recommendations, safetyLevel: level, heatIndex },
    });
  } catch (err: any) {
    console.error('[Safety] createReading error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit reading' });
  }
});

// ─── Incidents / Reports ──────────────────────────────────────────────────────

// GET /api/safety/incidents
router.get('/incidents', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const workerId = isCoordinatorOrAdmin(authReq.user!.role)
      ? (req.query.workerId as string | undefined)
      : authReq.user!.userId;
    const status = req.query.status as string | undefined;
    const incidents = await safetyRepo.findIncidents({ workerId, status });
    return res.json({ success: true, data: incidents });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to load incidents' });
  }
});

// POST /api/safety/incidents — worker reports an incident
router.post('/incidents', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { type, description, severity, location, workerName } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: 'description is required' });
  }
  if (!type) {
    return res.status(400).json({ success: false, error: 'incident type is required' });
  }

  const workerId = authReq.user!.userId;

  try {
    const user = await userRepo.findById(workerId);
    const name = workerName || user?.name || user?.full_name || 'Worker';

    const incident = await safetyRepo.createIncident({
      workerId,
      workerName: name,
      type,
      description: description.trim(),
      severity: severity || 'CAUTION',
      location: location || 'Salt Pan Area',
      status: 'REPORTED',
    });

    // Notify worker
    await notificationRepo.create({
      userId: workerId,
      type: 'SAFETY_ALERT',
      category: 'SAFETY',
      title: 'Safety Incident Reported',
      message: 'Your safety incident report has been submitted. A coordinator will follow up.',
      isRead: false,
      link: '/safety',
      metadata: { incidentId: incident.id },
    } as any);

    // Notify coordinators if high severity
    const isHighSeverity = severity === 'HIGH_RISK' || severity === 'EMERGENCY';
    await notifyCoordinatorsOfSafety(
      isHighSeverity ? `🚨 ${severity} Safety Report` : 'New Safety Incident Report',
      `${name} reported a ${type.replace('_', ' ').toLowerCase()} incident (${severity}).`,
      workerId,
      '/coordinator/safety',
      { incidentId: incident.id, severity, type }
    );

    return res.status(201).json({ success: true, data: incident, message: 'Incident reported successfully.' });
  } catch (err: any) {
    console.error('[Safety] createIncident error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to report incident' });
  }
});

// ─── Coordinator Incident Management ─────────────────────────────────────────

// GET /api/safety/coordinator/incidents
router.get(
  '/coordinator/incidents',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { workerId, status, severity } = req.query;
    try {
      let incidents = await safetyRepo.findIncidents({
        workerId: workerId as string | undefined,
        status: status as string | undefined,
      });
      if (severity) incidents = incidents.filter(i => i.severity === severity);
      // Sort by severity then date
      const sevOrder: Record<string, number> = { EMERGENCY: 0, HIGH_RISK: 1, CAUTION: 2, NORMAL: 3 };
      incidents.sort((a, b) => {
        const sa = sevOrder[a.severity] ?? 3;
        const sb = sevOrder[b.severity] ?? 3;
        if (sa !== sb) return sa - sb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return res.json({ success: true, data: incidents });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to load incidents' });
    }
  }
);

// PUT /api/safety/coordinator/incidents/:id
router.put(
  '/coordinator/incidents/:id',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { status, coordinatorNotes, assignedTo } = req.body;
    try {
      const existing = await safetyRepo.findIncidentById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Incident not found' });

      const updated = await safetyRepo.updateIncident(req.params.id, { status, coordinatorNotes, assignedTo });

      if (status && status !== existing.status) {
        const msgs: Record<string, string> = {
          ACKNOWLEDGED: 'Your safety report has been acknowledged by a coordinator.',
          IN_PROGRESS: 'Your safety report is being addressed.',
          RESOLVED: 'Your safety incident has been resolved.',
          CLOSED: 'Your safety incident report has been closed.',
        };
        const msg = msgs[status];
        if (msg) {
          await notificationRepo.create({
            userId: existing.workerId,
            type: 'SAFETY_ALERT',
            category: 'SAFETY',
            title: `Safety Report ${status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}`,
            message: msg,
            isRead: false,
            link: '/safety',
            metadata: { incidentId: req.params.id, newStatus: status },
          } as any);
        }
      }

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to update incident' });
    }
  }
);

// ─── Alerts ───────────────────────────────────────────────────────────────────

// GET /api/safety/alerts — public
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await safetyRepo.findActiveAlerts();
    res.json({ success: true, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load alerts' });
  }
});

// POST /api/safety/coordinator/alerts — coordinator creates alert
router.post(
  '/coordinator/alerts',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { type, title, message, affectedArea, severity } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });
    try {
      const alert = await safetyRepo.createAlert({ type, title, message, affectedArea, isActive: true, severity });
      return res.status(201).json({ success: true, data: alert });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to create alert' });
    }
  }
);

// ─── SOS / Emergency ──────────────────────────────────────────────────────────

// POST /api/safety/sos — worker activates SOS
router.post('/sos', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { location, description, workerName } = req.body;
  const workerId = authReq.user!.userId;

  try {
    const user = await userRepo.findById(workerId);
    const name = workerName || user?.name || user?.full_name || 'Worker';

    const event = await emergencyRepo.create({
      workerId,
      workerName: name,
      location: location || 'Salt Pan Area',
      description: description || 'Worker has activated SOS emergency alert.',
      status: 'ACTIVE',
    });

    // Notify worker — SOS received
    await notificationRepo.create({
      userId: workerId,
      type: 'SAFETY_ALERT',
      category: 'SAFETY',
      title: '🚨 SOS Activated',
      message: 'Your emergency alert has been sent. Coordinators have been notified. For immediate help, call 108.',
      isRead: false,
      link: '/safety',
      metadata: { emergencyId: event.id },
    } as any);

    // Notify all coordinators
    await notifyCoordinatorsOfSafety(
      `🚨 SOS EMERGENCY — ${name}`,
      `${name} has activated an SOS emergency alert. Location: ${event.location ?? 'Unknown'}. Immediate attention required.`,
      workerId,
      '/coordinator/safety',
      { emergencyId: event.id, workerId }
    );

    // Create a safety alert visible to all workers
    await safetyRepo.createAlert({
      type: 'EMERGENCY',
      title: '🚨 Emergency SOS Activated',
      message: `Emergency SOS from a worker in the area. Coordinators notified. Call 108 for immediate help.`,
      affectedArea: event.location ?? 'Salt Pan Area',
      isActive: true,
      severity: 'EMERGENCY',
    });

    const emergencyContact = process.env.EMERGENCY_CONTACT_PHONE || '108';

    return res.status(201).json({
      success: true,
      data: {
        event,
        emergencyContact,
        instructions: [
          `Call ${emergencyContact} immediately for medical emergency`,
          'Move to shade or shelter',
          'Stay with someone if possible',
          'Coordinators have been notified',
          'Do not return to work until cleared by a coordinator',
        ],
      },
      message: 'Emergency alert sent. Help is on the way. Call 108 immediately for life-threatening emergencies.',
    });
  } catch (err: any) {
    console.error('[Safety SOS] error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create emergency event' });
  }
});

// GET /api/safety/sos — worker sees own SOS events
router.get('/sos', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const workerId = isCoordinatorOrAdmin(authReq.user!.role)
      ? undefined
      : authReq.user!.userId;
    const events = await emergencyRepo.findAll({ workerId });
    return res.json({ success: true, data: events });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to load emergency events' });
  }
});

// GET /api/safety/coordinator/sos — coordinator sees all active events
router.get(
  '/coordinator/sos',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { status } = req.query;
    try {
      const events = await emergencyRepo.findAll({ status: (status as string) || undefined });
      return res.json({ success: true, data: events });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to load SOS events' });
    }
  }
);

// PUT /api/safety/coordinator/sos/:id — coordinator responds
router.put(
  '/coordinator/sos/:id',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { status, coordinatorNotes } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    try {
      const event = await emergencyRepo.findById(req.params.id);
      if (!event) return res.status(404).json({ success: false, error: 'Emergency event not found' });

      const updated = await emergencyRepo.update(req.params.id, {
        status,
        coordinatorNotes,
        acknowledgedBy: authReq.user!.userId,
      });

      const msgs: Record<string, string> = {
        ACKNOWLEDGED: '✅ Your SOS has been acknowledged. A coordinator is responding. Call 108 for immediate emergencies.',
        RESOLVED: '✅ Your emergency event has been marked as resolved. Stay safe.',
        CANCELLED: 'Your SOS event has been cancelled.',
      };
      const msg = msgs[status];
      if (msg) {
        await notificationRepo.create({
          userId: event.workerId,
          type: 'SAFETY_ALERT',
          category: 'SAFETY',
          title: `SOS ${status.charAt(0) + status.slice(1).toLowerCase()}`,
          message: msg,
          isRead: false,
          link: '/safety',
          metadata: { emergencyId: req.params.id, newStatus: status },
        } as any);
      }

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to update emergency event' });
    }
  }
);

export default router;
