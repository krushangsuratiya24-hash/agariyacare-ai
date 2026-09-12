/**
 * Migration 010 — Phase 5: Healthcare Requests, Safety Reports, Emergency Events
 *
 * Creates / extends tables for:
 *   healthcare_requests  — worker healthcare submissions with full status workflow
 *   healthcare_notes     — coordinator notes on a request
 *   safety_reports       — worker safety incident reports (replaces in-memory only)
 *   safety_assessments   — safety readings (heat index etc.)
 *   emergency_events     — SOS activations
 *   safety_alerts        — system-wide active alerts
 *
 * Uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS — safe to re-run.
 */

import { query } from '../pool';

const up = async (): Promise<void> => {

  // ── Healthcare Requests ───────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS healthcare_requests (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_name       VARCHAR(255),
      symptoms          TEXT[],
      description       TEXT NOT NULL,
      severity          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                          CHECK (severity IN ('LOW','MEDIUM','HIGH','EMERGENCY')),
      status            VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
                          CHECK (status IN ('SUBMITTED','REVIEWING','REFERRED','SCHEDULED','RESOLVED','CLOSED')),
      coordinator_notes TEXT,
      assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
      scheduled_date    TIMESTAMPTZ,
      resolved_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_hc_requests_worker_id ON healthcare_requests(worker_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_hc_requests_status    ON healthcare_requests(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_hc_requests_severity  ON healthcare_requests(severity)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_hc_requests_created   ON healthcare_requests(created_at DESC)`);

  // ── Healthcare Notes (coordinator) ────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS healthcare_notes (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id     UUID NOT NULL REFERENCES healthcare_requests(id) ON DELETE CASCADE,
      author_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name    VARCHAR(255),
      note           TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_hc_notes_request_id ON healthcare_notes(request_id)`);

  // ── Healthcare Camps ──────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS healthcare_camps (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(255) NOT NULL,
      location    TEXT NOT NULL,
      date        DATE NOT NULL,
      time        VARCHAR(50),
      services    TEXT[],
      contact     VARCHAR(100),
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      capacity    INTEGER,
      registered  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_hc_camps_is_active ON healthcare_camps(is_active)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_hc_camps_date      ON healthcare_camps(date)`);

  // ── Safety Reports (incidents) ────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS safety_reports (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_name       VARCHAR(255),
      type              VARCHAR(50) NOT NULL,
      description       TEXT NOT NULL,
      severity          VARCHAR(20) NOT NULL DEFAULT 'CAUTION'
                          CHECK (severity IN ('NORMAL','CAUTION','HIGH_RISK','EMERGENCY')),
      location          VARCHAR(255),
      status            VARCHAR(30) NOT NULL DEFAULT 'REPORTED'
                          CHECK (status IN ('REPORTED','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','CLOSED')),
      coordinator_notes TEXT,
      assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at       TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_sr_worker_id ON safety_reports(worker_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sr_status    ON safety_reports(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sr_severity  ON safety_reports(severity)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sr_created   ON safety_reports(created_at DESC)`);

  // ── Safety Assessments (heat readings) ───────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS safety_assessments (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id             UUID REFERENCES users(id) ON DELETE CASCADE,
      temperature           NUMERIC(5,2) NOT NULL,
      humidity              NUMERIC(5,2) NOT NULL,
      heat_index            NUMERIC(5,2) NOT NULL,
      safety_level          VARCHAR(20) NOT NULL DEFAULT 'CAUTION'
                              CHECK (safety_level IN ('SAFE','CAUTION','HIGH_RISK','EMERGENCY')),
      working_duration_hrs  NUMERIC(4,1) NOT NULL DEFAULT 0,
      water_availability    VARCHAR(20) NOT NULL DEFAULT 'SUFFICIENT'
                              CHECK (water_availability IN ('SUFFICIENT','LIMITED','NONE')),
      rest_breaks_taken     INTEGER NOT NULL DEFAULT 0,
      source                VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
      recommendations       TEXT[],
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_sa_worker_id  ON safety_assessments(worker_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sa_created    ON safety_assessments(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sa_level      ON safety_assessments(safety_level)`);

  // ── Safety Alerts ─────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS safety_alerts (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type          VARCHAR(30),
      title         VARCHAR(255),
      message       TEXT NOT NULL,
      affected_area VARCHAR(255),
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      severity      VARCHAR(20),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at    TIMESTAMPTZ
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON safety_alerts(is_active)`);

  // ── Emergency Events (SOS) ────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS emergency_events (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      worker_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      worker_name     VARCHAR(255),
      location        VARCHAR(255),
      description     TEXT,
      status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','ACKNOWLEDGED','RESOLVED','CANCELLED')),
      acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
      acknowledged_at TIMESTAMPTZ,
      resolved_at     TIMESTAMPTZ,
      coordinator_notes TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_ee_worker_id  ON emergency_events(worker_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ee_status     ON emergency_events(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ee_created    ON emergency_events(created_at DESC)`);

  console.log('  ✓ Migration 010 — Healthcare requests, safety reports, emergency events tables ready');
};

export default up;
