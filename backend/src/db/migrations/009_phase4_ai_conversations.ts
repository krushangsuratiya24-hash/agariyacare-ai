/**
 * Migration 009 — Phase 4: AI Conversations & Messages
 *
 * Creates tables for persisting AI chat sessions:
 *   ai_conversations  — one row per conversation, owned by a user
 *   ai_messages       — individual chat turns (user + assistant)
 *
 * Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS — safe to re-run.
 */

import { query } from '../pool';

const up = async (): Promise<void> => {
  // ── AI Conversations ──────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
      is_archived BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id   ON ai_conversations(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC)`);

  // ── AI Messages ───────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role             VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content          TEXT NOT NULL,
      agents_used      TEXT[],
      actions          JSONB,
      tools_used       TEXT[],
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at       ON ai_messages(created_at)`);

  console.log('  ✓ Migration 009 — AI conversations and messages tables ready');
};

export default up;
