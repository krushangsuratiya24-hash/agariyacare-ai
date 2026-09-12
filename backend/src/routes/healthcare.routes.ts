/**
 * Phase 5 — Healthcare Routes (enhanced)
 *
 * Worker routes:
 *   GET  /api/healthcare/requests          — own requests
 *   POST /api/healthcare/requests          — submit request
 *   GET  /api/healthcare/requests/:id      — single request (own only)
 *   GET  /api/healthcare/camps             — active camps
 *
 * Coordinator routes:
 *   GET  /api/healthcare/coordinator/requests           — all requests (filterable)
 *   PUT  /api/healthcare/coordinator/requests/:id       — update status/notes
 *   POST /api/healthcare/coordinator/requests/:id/notes — add coordinator note
 *   GET  /api/healthcare/coordinator/requests/:id/notes — get notes
 *
 * Admin routes:
 *   GET  /api/healthcare/admin/requests    — all requests
 *   POST /api/healthcare/camps             — create camp
 *   PUT  /api/healthcare/camps/:id         — update camp
 */

import { Router, Request, Response } from 'express';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { healthcareRepo, notificationRepo, userRepo } from '../repositories';
import { PgHealthcareRepository } from '../repositories/pg.repositories';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCoordinatorOrAdmin(role: string) {
  return role === 'COORDINATOR' || role === 'ADMIN';
}

// Notify all coordinators about a new high-priority request
async function notifyCoordinators(workerId: string, workerName: string, severity: string, requestId: string) {
  try {
    // Find all coordinators/admins
    const users = await userRepo.findAll();
    const coordinators = users.filter(u => u.role === 'COORDINATOR' || u.role === 'ADMIN');
    const isHighPriority = severity === 'HIGH' || severity === 'EMERGENCY';
    for (const coord of coordinators) {
      await notificationRepo.create({
        userId: coord.id,
        type: 'HEALTHCARE_UPDATE',
        category: 'HEALTH',
        title: isHighPriority ? `🚨 Urgent Healthcare Request` : 'New Healthcare Request',
        message: `${workerName} submitted a ${severity.toLowerCase()} priority healthcare request. Please review.`,
        isRead: false,
        link: `/coordinator/healthcare`,
        metadata: { requestId, workerId, severity },
      } as any);
    }
  } catch (e) {
    console.error('[Healthcare] Failed to notify coordinators:', e);
  }
}

// ─── Worker Routes ────────────────────────────────────────────────────────────

// GET /api/healthcare/requests — worker sees only their own
router.get('/requests', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { status } = req.query;
  try {
    const workerId = isCoordinatorOrAdmin(authReq.user!.role)
      ? (req.query.workerId as string | undefined)
      : authReq.user!.userId;

    const requests = await healthcareRepo.findAllRequests({
      workerId: workerId || undefined,
      status: status as string | undefined,
    });
    return res.json({ success: true, data: requests });
  } catch (err: any) {
    console.error('[Healthcare] findAllRequests error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load healthcare requests' });
  }
});

// GET /api/healthcare/requests/:id
router.get('/requests/:id', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const request = await healthcareRepo.findRequestById(req.params.id);
    if (!request) return res.status(404).json({ success: false, error: 'Request not found' });

    // Workers can only see their own requests
    if (!isCoordinatorOrAdmin(authReq.user!.role) && request.workerId !== authReq.user!.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    return res.json({ success: true, data: request });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to load request' });
  }
});

// POST /api/healthcare/requests — worker submits a new request
router.post('/requests', requireAuth, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { symptoms, description, severity, workerName } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: 'description is required' });
  }
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one symptom is required' });
  }

  const workerId = authReq.user!.userId;

  try {
    const user = await userRepo.findById(workerId);
    const name = workerName || user?.name || user?.full_name || 'Worker';

    const request = await healthcareRepo.createRequest({
      workerId,
      workerName: name,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      description: description.trim(),
      severity: severity || 'MEDIUM',
      status: 'SUBMITTED',
    });

    // Notify worker — request received
    await notificationRepo.create({
      userId: workerId,
      type: 'HEALTHCARE_UPDATE',
      category: 'HEALTH',
      title: 'Healthcare Request Submitted',
      message: 'Your healthcare request has been received. A coordinator will review it soon.',
      isRead: false,
      link: '/healthcare',
      metadata: { requestId: request.id },
    } as any);

    // Notify coordinators
    await notifyCoordinators(workerId, name, severity || 'MEDIUM', request.id);

    return res.status(201).json({ success: true, data: request, message: 'Healthcare request submitted successfully.' });
  } catch (err: any) {
    console.error('[Healthcare] createRequest error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to submit request' });
  }
});

// ─── Coordinator Routes ───────────────────────────────────────────────────────

// GET /api/healthcare/coordinator/requests — all requests with optional filters
router.get(
  '/coordinator/requests',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const { workerId, status, severity } = req.query;
    try {
      let requests = await healthcareRepo.findAllRequests({
        workerId: workerId as string | undefined,
        status: status as string | undefined,
      });
      if (severity) {
        requests = requests.filter(r => r.severity === severity);
      }
      // Sort by severity urgency then date
      const sevOrder: Record<string, number> = { EMERGENCY: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      requests.sort((a, b) => {
        const sa = sevOrder[a.severity ?? 'LOW'] ?? 3;
        const sb = sevOrder[b.severity ?? 'LOW'] ?? 3;
        if (sa !== sb) return sa - sb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return res.json({ success: true, data: requests });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to load requests' });
    }
  }
);

// PUT /api/healthcare/coordinator/requests/:id — update status and coordinator notes
router.put(
  '/coordinator/requests/:id',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { status, coordinatorNotes, assignedTo, scheduledDate, severity } = req.body;

    try {
      const existing = await healthcareRepo.findRequestById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Request not found' });

      const updated = await healthcareRepo.updateRequest(req.params.id, {
        status,
        coordinatorNotes,
        assignedTo,
        scheduledDate,
        severity,
      });

      // Notify worker when status changes
      if (status && status !== existing.status) {
        const statusMessages: Record<string, string> = {
          REVIEWING: 'Your healthcare request is being reviewed by a coordinator.',
          REFERRED: 'Your healthcare request has been referred to a healthcare provider.',
          SCHEDULED: `Your healthcare appointment has been scheduled${scheduledDate ? ` for ${new Date(scheduledDate).toLocaleDateString('en-IN')}` : ''}.`,
          RESOLVED: 'Your healthcare request has been resolved.',
          CLOSED: 'Your healthcare request has been closed.',
        };
        const msg = statusMessages[status];
        if (msg) {
          await notificationRepo.create({
            userId: existing.workerId,
            type: 'HEALTHCARE_UPDATE',
            category: 'HEALTH',
            title: `Healthcare Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
            message: msg,
            isRead: false,
            link: '/healthcare',
            metadata: { requestId: req.params.id, newStatus: status },
          } as any);
        }
      }

      return res.json({ success: true, data: updated, message: 'Request updated.' });
    } catch (err: any) {
      console.error('[Healthcare] updateRequest error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to update request' });
    }
  }
);

// POST /api/healthcare/coordinator/requests/:id/notes — add coordinator note
router.post(
  '/coordinator/requests/:id/notes',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: 'note is required' });
    }
    try {
      const existing = await healthcareRepo.findRequestById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Request not found' });

      const user = await userRepo.findById(authReq.user!.userId);
      const authorName = user?.name || user?.full_name || 'Coordinator';

      // PgHealthcareRepository has addNote; dev repo falls back to updating coordinatorNotes
      if ((healthcareRepo as any).addNote) {
        const savedNote = await (healthcareRepo as PgHealthcareRepository).addNote(
          req.params.id, authReq.user!.userId, authorName, note.trim()
        );
        return res.status(201).json({ success: true, data: savedNote });
      } else {
        // Dev fallback: append to coordinatorNotes field
        const current = existing.coordinatorNotes ?? '';
        const appended = current ? `${current}\n[${authorName}]: ${note.trim()}` : `[${authorName}]: ${note.trim()}`;
        const updated = await healthcareRepo.updateRequest(req.params.id, { coordinatorNotes: appended });
        return res.status(201).json({ success: true, data: { note: note.trim(), authorName }, message: 'Note added.' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to add note' });
    }
  }
);

// GET /api/healthcare/coordinator/requests/:id/notes
router.get(
  '/coordinator/requests/:id/notes',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      if ((healthcareRepo as any).findNotesByRequestId) {
        const notes = await (healthcareRepo as PgHealthcareRepository).findNotesByRequestId(req.params.id);
        return res.json({ success: true, data: notes });
      }
      return res.json({ success: true, data: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to load notes' });
    }
  }
);

// ─── Shared Camp Routes ───────────────────────────────────────────────────────

// GET /api/healthcare/camps — public (auth optional)
router.get('/camps', async (req, res) => {
  try {
    const camps = await healthcareRepo.findAllCamps();
    res.json({ success: true, data: camps });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load camps' });
  }
});

// GET /api/healthcare/camps/:id
router.get('/camps/:id', async (req, res) => {
  try {
    const camp = await healthcareRepo.findCampById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, error: 'Camp not found' });
    res.json({ success: true, data: camp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to load camp' });
  }
});

// POST /api/healthcare/camps — coordinator/admin only
router.post(
  '/camps',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const camp = await healthcareRepo.createCamp(req.body);
      return res.status(201).json({ success: true, data: camp });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to create camp' });
    }
  }
);

// PUT /api/healthcare/camps/:id — coordinator/admin only
router.put(
  '/camps/:id',
  requireAuth,
  requireRole('COORDINATOR', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const updated = await healthcareRepo.updateCamp(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, error: 'Camp not found' });
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to update camp' });
    }
  }
);

export default router;
