/**
 * PostgreSQL-backed repositories for Phase 5:
 * - PgHealthcareRepository
 * - PgSafetyRepository
 * - PgEmergencyRepository
 * - PgNotificationRepository
 *
 * These implementations talk directly to the Postgres pool.
 * They are used when DATABASE_URL is set (production / Docker).
 * In development without a DB, the dev repositories remain as fallback.
 */

import { query } from '../db/pool';
import {
  HealthcareRequest, HealthcareCamp,
  SafetyReading, SafetyIncident, SafetyAlert,
  Notification,
} from '../types';
import type {
  HealthcareRepository,
  SafetyRepository,
  NotificationRepository,
} from './interfaces';

// ─────────────────────────────────────────────────────────────────────────────
// Emergency event types (Phase 5 specific — not in base types)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmergencyEvent {
  id: string;
  workerId: string;
  workerName?: string;
  location?: string;
  description?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  coordinatorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthcareNote {
  id: string;
  requestId: string;
  authorId: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

export interface EmergencyRepository {
  findAll(filters?: { status?: string; workerId?: string }): Promise<EmergencyEvent[]>;
  findById(id: string): Promise<EmergencyEvent | null>;
  create(data: Omit<EmergencyEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyEvent>;
  update(id: string, updates: Partial<EmergencyEvent>): Promise<EmergencyEvent | null>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────────────────

function rowToHealthcareRequest(row: any): HealthcareRequest {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    symptoms: row.symptoms ?? [],
    description: row.description,
    severity: row.severity,
    status: row.status,
    coordinatorNotes: row.coordinator_notes,
    assignedTo: row.assigned_to,
    scheduledDate: row.scheduled_date,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToHealthcareCamp(row: any): HealthcareCamp {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    time: row.time ?? '',
    services: row.services ?? [],
    contact: row.contact ?? '',
    isActive: row.is_active,
    capacity: row.capacity,
    registered: row.registered ?? 0,
  };
}

function rowToSafetyAssessment(row: any): SafetyReading {
  return {
    id: row.id,
    workerId: row.worker_id,
    temperature: parseFloat(row.temperature),
    humidity: parseFloat(row.humidity),
    heatIndex: parseFloat(row.heat_index),
    safetyLevel: row.safety_level,
    riskLevel: row.safety_level,
    workingDurationHours: parseFloat(row.working_duration_hrs ?? 0),
    waterAvailability: row.water_availability,
    restBreaksTaken: row.rest_breaks_taken ?? 0,
    source: row.source ?? 'MANUAL',
    timestamp: row.created_at,
    recordedAt: row.created_at,
  };
}

function rowToSafetyReport(row: any): SafetyIncident {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    type: row.type,
    description: row.description,
    severity: row.severity,
    location: row.location,
    status: row.status,
    coordinatorNotes: row.coordinator_notes,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSafetyAlert(row: any): SafetyAlert {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    affectedArea: row.affected_area,
    isActive: row.is_active,
    severity: row.severity,
    createdAt: row.created_at,
  };
}

function rowToEmergencyEvent(row: any): EmergencyEvent {
  return {
    id: row.id,
    workerId: row.worker_id,
    workerName: row.worker_name,
    location: row.location,
    description: row.description,
    status: row.status,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    coordinatorNotes: row.coordinator_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    message: row.body ?? row.message,
    isRead: row.is_read,
    is_read: row.is_read,
    category: row.category,
    link: row.link,
    metadata: row.metadata,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PgHealthcareRepository
// ─────────────────────────────────────────────────────────────────────────────

export class PgHealthcareRepository implements HealthcareRepository {
  async findRequestById(id: string): Promise<HealthcareRequest | null> {
    const res = await query('SELECT * FROM healthcare_requests WHERE id = $1', [id]);
    return res.rows.length ? rowToHealthcareRequest(res.rows[0]) : null;
  }

  async findAllRequests(filters?: { workerId?: string; status?: string }): Promise<HealthcareRequest[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters?.workerId) { conditions.push(`worker_id = $${params.length + 1}`); params.push(filters.workerId); }
    if (filters?.status)   { conditions.push(`status = $${params.length + 1}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query(`SELECT * FROM healthcare_requests ${where} ORDER BY created_at DESC`, params);
    return res.rows.map(rowToHealthcareRequest);
  }

  async createRequest(req: Omit<HealthcareRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthcareRequest> {
    const res = await query(
      `INSERT INTO healthcare_requests
        (worker_id, worker_name, symptoms, description, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.workerId, req.workerName ?? null, req.symptoms ?? [], req.description, req.severity ?? 'MEDIUM', req.status ?? 'SUBMITTED']
    );
    return rowToHealthcareRequest(res.rows[0]);
  }

  async updateRequest(id: string, updates: Partial<HealthcareRequest>): Promise<HealthcareRequest | null> {
    const setClause: string[] = [];
    const params: unknown[] = [];

    if (updates.status !== undefined)          { params.push(updates.status);           setClause.push(`status = $${params.length}`); }
    if (updates.coordinatorNotes !== undefined) { params.push(updates.coordinatorNotes); setClause.push(`coordinator_notes = $${params.length}`); }
    if (updates.assignedTo !== undefined)       { params.push(updates.assignedTo);       setClause.push(`assigned_to = $${params.length}`); }
    if (updates.scheduledDate !== undefined)    { params.push(updates.scheduledDate);    setClause.push(`scheduled_date = $${params.length}`); }
    if (updates.severity !== undefined)         { params.push(updates.severity);         setClause.push(`severity = $${params.length}`); }
    if (updates.symptoms !== undefined)         { params.push(updates.symptoms);         setClause.push(`symptoms = $${params.length}`); }
    if (updates.description !== undefined)      { params.push(updates.description);      setClause.push(`description = $${params.length}`); }

    if (updates.status === 'RESOLVED') { setClause.push(`resolved_at = NOW()`); }
    setClause.push(`updated_at = NOW()`);

    if (setClause.length === 1) { return this.findRequestById(id); } // only updated_at

    params.push(id);
    const res = await query(
      `UPDATE healthcare_requests SET ${setClause.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return res.rows.length ? rowToHealthcareRequest(res.rows[0]) : null;
  }

  async findAllCamps(): Promise<HealthcareCamp[]> {
    const res = await query('SELECT * FROM healthcare_camps ORDER BY date ASC');
    return res.rows.map(rowToHealthcareCamp);
  }

  async findCampById(id: string): Promise<HealthcareCamp | null> {
    const res = await query('SELECT * FROM healthcare_camps WHERE id = $1', [id]);
    return res.rows.length ? rowToHealthcareCamp(res.rows[0]) : null;
  }

  async createCamp(camp: Omit<HealthcareCamp, 'id'>): Promise<HealthcareCamp> {
    const res = await query(
      `INSERT INTO healthcare_camps (name, location, date, time, services, contact, is_active, capacity, registered)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [camp.name, camp.location, camp.date, camp.time, camp.services ?? [], camp.contact ?? '', camp.isActive ?? true, camp.capacity ?? null, camp.registered ?? 0]
    );
    return rowToHealthcareCamp(res.rows[0]);
  }

  async updateCamp(id: string, updates: Partial<HealthcareCamp>): Promise<HealthcareCamp | null> {
    const setClause: string[] = [];
    const params: unknown[] = [];
    if (updates.name !== undefined)      { params.push(updates.name);      setClause.push(`name = $${params.length}`); }
    if (updates.location !== undefined)  { params.push(updates.location);  setClause.push(`location = $${params.length}`); }
    if (updates.isActive !== undefined)  { params.push(updates.isActive);  setClause.push(`is_active = $${params.length}`); }
    if (updates.registered !== undefined){ params.push(updates.registered); setClause.push(`registered = $${params.length}`); }
    if (setClause.length === 0) { return this.findCampById(id); }
    params.push(id);
    const res = await query(
      `UPDATE healthcare_camps SET ${setClause.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return res.rows.length ? rowToHealthcareCamp(res.rows[0]) : null;
  }

  // Phase 5: coordinator notes
  async addNote(requestId: string, authorId: string, authorName: string, note: string): Promise<HealthcareNote> {
    const res = await query(
      `INSERT INTO healthcare_notes (request_id, author_id, author_name, note) VALUES ($1, $2, $3, $4) RETURNING *`,
      [requestId, authorId, authorName, note]
    );
    const row = res.rows[0];
    return { id: row.id, requestId: row.request_id, authorId: row.author_id, authorName: row.author_name, note: row.note, createdAt: row.created_at };
  }

  async findNotesByRequestId(requestId: string): Promise<HealthcareNote[]> {
    const res = await query('SELECT * FROM healthcare_notes WHERE request_id = $1 ORDER BY created_at ASC', [requestId]);
    return res.rows.map(row => ({
      id: row.id, requestId: row.request_id, authorId: row.author_id,
      authorName: row.author_name, note: row.note, createdAt: row.created_at,
    }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PgSafetyRepository
// ─────────────────────────────────────────────────────────────────────────────

export class PgSafetyRepository implements SafetyRepository {
  async findReadings(workerId?: string): Promise<SafetyReading[]> {
    if (workerId) {
      const res = await query('SELECT * FROM safety_assessments WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 50', [workerId]);
      return res.rows.map(rowToSafetyAssessment);
    }
    const res = await query('SELECT * FROM safety_assessments ORDER BY created_at DESC LIMIT 100');
    return res.rows.map(rowToSafetyAssessment);
  }

  async createReading(reading: Omit<SafetyReading, 'id'>): Promise<SafetyReading> {
    const res = await query(
      `INSERT INTO safety_assessments
        (worker_id, temperature, humidity, heat_index, safety_level, working_duration_hrs, water_availability, rest_breaks_taken, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        reading.workerId ?? null,
        reading.temperature,
        reading.humidity,
        reading.heatIndex,
        reading.safetyLevel ?? 'CAUTION',
        reading.workingDurationHours ?? 0,
        reading.waterAvailability ?? 'SUFFICIENT',
        reading.restBreaksTaken ?? 0,
        reading.source ?? 'MANUAL',
      ]
    );
    return rowToSafetyAssessment(res.rows[0]);
  }

  async findIncidents(filters?: { workerId?: string; status?: string }): Promise<SafetyIncident[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters?.workerId) { conditions.push(`worker_id = $${params.length + 1}`); params.push(filters.workerId); }
    if (filters?.status)   { conditions.push(`status = $${params.length + 1}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query(`SELECT * FROM safety_reports ${where} ORDER BY created_at DESC`, params);
    return res.rows.map(rowToSafetyReport);
  }

  async findIncidentById(id: string): Promise<SafetyIncident | null> {
    const res = await query('SELECT * FROM safety_reports WHERE id = $1', [id]);
    return res.rows.length ? rowToSafetyReport(res.rows[0]) : null;
  }

  async createIncident(incident: Omit<SafetyIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<SafetyIncident> {
    const res = await query(
      `INSERT INTO safety_reports (worker_id, worker_name, type, description, severity, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        incident.workerId,
        incident.workerName ?? null,
        incident.type ?? 'OTHER',
        incident.description,
        incident.severity ?? 'CAUTION',
        incident.location ?? 'Salt Pan Area',
        incident.status ?? 'REPORTED',
      ]
    );
    return rowToSafetyReport(res.rows[0]);
  }

  async updateIncident(id: string, updates: Partial<SafetyIncident>): Promise<SafetyIncident | null> {
    const setClause: string[] = [];
    const params: unknown[] = [];
    if (updates.status !== undefined)          { params.push(updates.status);           setClause.push(`status = $${params.length}`); }
    if (updates.coordinatorNotes !== undefined) { params.push(updates.coordinatorNotes); setClause.push(`coordinator_notes = $${params.length}`); }
    if (updates.assignedTo !== undefined)       { params.push(updates.assignedTo);       setClause.push(`assigned_to = $${params.length}`); }
    setClause.push(`updated_at = NOW()`);
    if (updates.status === 'RESOLVED') { setClause.push(`resolved_at = NOW()`); }
    params.push(id);
    const res = await query(
      `UPDATE safety_reports SET ${setClause.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return res.rows.length ? rowToSafetyReport(res.rows[0]) : null;
  }

  async findActiveAlerts(): Promise<SafetyAlert[]> {
    const res = await query(
      `SELECT * FROM safety_alerts WHERE is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`
    );
    return res.rows.map(rowToSafetyAlert);
  }

  async createAlert(alert: Omit<SafetyAlert, 'id' | 'createdAt'>): Promise<SafetyAlert> {
    const res = await query(
      `INSERT INTO safety_alerts (type, title, message, affected_area, is_active, severity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [alert.type ?? null, alert.title ?? null, alert.message, alert.affectedArea ?? null, alert.isActive ?? true, alert.severity ?? null]
    );
    return rowToSafetyAlert(res.rows[0]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PgEmergencyRepository
// ─────────────────────────────────────────────────────────────────────────────

export class PgEmergencyRepository implements EmergencyRepository {
  async findAll(filters?: { status?: string; workerId?: string }): Promise<EmergencyEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters?.workerId) { conditions.push(`worker_id = $${params.length + 1}`); params.push(filters.workerId); }
    if (filters?.status)   { conditions.push(`status = $${params.length + 1}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query(`SELECT * FROM emergency_events ${where} ORDER BY created_at DESC`, params);
    return res.rows.map(rowToEmergencyEvent);
  }

  async findById(id: string): Promise<EmergencyEvent | null> {
    const res = await query('SELECT * FROM emergency_events WHERE id = $1', [id]);
    return res.rows.length ? rowToEmergencyEvent(res.rows[0]) : null;
  }

  async create(data: Omit<EmergencyEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyEvent> {
    const res = await query(
      `INSERT INTO emergency_events (worker_id, worker_name, location, description, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.workerId, data.workerName ?? null, data.location ?? null, data.description ?? null, data.status ?? 'ACTIVE']
    );
    return rowToEmergencyEvent(res.rows[0]);
  }

  async update(id: string, updates: Partial<EmergencyEvent>): Promise<EmergencyEvent | null> {
    const setClause: string[] = [];
    const params: unknown[] = [];
    if (updates.status !== undefined)           { params.push(updates.status);            setClause.push(`status = $${params.length}`); }
    if (updates.acknowledgedBy !== undefined)   { params.push(updates.acknowledgedBy);    setClause.push(`acknowledged_by = $${params.length}`); }
    if (updates.coordinatorNotes !== undefined) { params.push(updates.coordinatorNotes);  setClause.push(`coordinator_notes = $${params.length}`); }
    if (updates.status === 'ACKNOWLEDGED') { setClause.push(`acknowledged_at = NOW()`); }
    if (updates.status === 'RESOLVED')     { setClause.push(`resolved_at = NOW()`); }
    setClause.push(`updated_at = NOW()`);
    params.push(id);
    const res = await query(
      `UPDATE emergency_events SET ${setClause.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return res.rows.length ? rowToEmergencyEvent(res.rows[0]) : null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PgNotificationRepository
// ─────────────────────────────────────────────────────────────────────────────

export class PgNotificationRepository implements NotificationRepository {
  async findByUserId(userId: string): Promise<Notification[]> {
    const res = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    );
    return res.rows.map(rowToNotification);
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    const res = await query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map(rowToNotification);
  }

  async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const userId = notification.userId ?? notification.user_id;
    const res = await query(
      `INSERT INTO notifications (user_id, type, title, body, is_read, category, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        notification.type,
        notification.title ?? null,
        notification.body ?? notification.message ?? null,
        notification.isRead ?? false,
        notification.category ?? null,
        notification.link ?? null,
        notification.metadata ?? null,
      ]
    );
    return rowToNotification(res.rows[0]);
  }

  async markAsRead(id: string): Promise<boolean> {
    const res = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
    return true;
  }
}
