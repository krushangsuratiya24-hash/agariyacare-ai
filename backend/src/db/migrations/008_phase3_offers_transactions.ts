/**
 * Migration 008 — Phase 3: Offers & Transactions
 *
 * Extends the stub offers + transactions tables created in migration 006
 * with all columns needed for real negotiation, counter-offer history,
 * inventory reservation, and transaction lifecycle.
 *
 * All ALTER TABLE statements use IF NOT EXISTS / DO blocks — safe to re-run.
 */

import { query } from '../pool';

const up = async (): Promise<void> => {

  // ── offers: add Phase 3 columns ────────────────────────────────────────────
  await query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS buyer_id   UUID REFERENCES users(id)`);
  await query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS worker_id  UUID REFERENCES users(id)`);
  await query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS total_amount DECIMAL(14,2)`);
  await query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS message    TEXT`);
  await query(`ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id)`);

  // Ensure status column allows Phase 3 values (TEXT is already flexible)
  // Add offer_history table for full negotiation audit trail
  await query(`
    CREATE TABLE IF NOT EXISTS offer_history (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id     UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
      actor_id     UUID NOT NULL REFERENCES users(id),
      actor_role   VARCHAR(20) NOT NULL CHECK (actor_role IN ('buyer','worker','admin')),
      event_type   VARCHAR(20) NOT NULL CHECK (event_type IN ('OFFER','COUNTER','ACCEPT','REJECT','WITHDRAW','EXPIRE')),
      price_per_kg DECIMAL(10,2) NOT NULL,
      quantity_kg  DECIMAL(12,2) NOT NULL,
      message      TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── transactions: add Phase 3 columns ─────────────────────────────────────
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS listing_id         UUID REFERENCES salt_listings(id)`);
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_ref    VARCHAR(50)`);
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS agreed_price_per_kg DECIMAL(10,2)`);
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  // Add transaction_status_history for audit trail
  await query(`
    CREATE TABLE IF NOT EXISTS transaction_status_history (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      actor_id       UUID NOT NULL REFERENCES users(id),
      from_status    VARCHAR(40),
      to_status      VARCHAR(40) NOT NULL,
      note           TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── transaction_ref sequence ───────────────────────────────────────────────
  await query(`
    CREATE SEQUENCE IF NOT EXISTS transaction_ref_seq START 1001 INCREMENT 1
  `);

  // ── Indexes ────────────────────────────────────────────────────────────────
  const indexes: [string, string][] = [
    ['idx_offers_listing_id',       'CREATE INDEX IF NOT EXISTS idx_offers_listing_id       ON offers(listing_id)'],
    ['idx_offers_buyer_id',         'CREATE INDEX IF NOT EXISTS idx_offers_buyer_id         ON offers(buyer_id)'],
    ['idx_offers_worker_id',        'CREATE INDEX IF NOT EXISTS idx_offers_worker_id        ON offers(worker_id)'],
    ['idx_offers_status',           'CREATE INDEX IF NOT EXISTS idx_offers_status           ON offers(status)'],
    ['idx_offers_parent_offer_id',  'CREATE INDEX IF NOT EXISTS idx_offers_parent_offer_id  ON offers(parent_offer_id)'],
    ['idx_offer_history_offer_id',  'CREATE INDEX IF NOT EXISTS idx_offer_history_offer_id  ON offer_history(offer_id)'],
    ['idx_transactions_listing_id', 'CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id)'],
    ['idx_transactions_seller_id',  'CREATE INDEX IF NOT EXISTS idx_transactions_seller_id  ON transactions(seller_id)'],
    ['idx_transactions_buyer_id',   'CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id   ON transactions(buyer_id)'],
    ['idx_transactions_status',     'CREATE INDEX IF NOT EXISTS idx_transactions_status      ON transactions(status)'],
    ['idx_tx_status_hist_tx_id',    'CREATE INDEX IF NOT EXISTS idx_tx_status_hist_tx_id    ON transaction_status_history(transaction_id)'],
  ];

  for (const [, sql] of indexes) {
    await query(sql);
  }

  // ── Backfill buyer_id / worker_id from from_user_id / to_user_id ──────────
  // (best-effort; ignore if columns already populated)
  await query(`
    UPDATE offers SET
      buyer_id  = from_user_id,
      worker_id = to_user_id
    WHERE buyer_id IS NULL AND from_user_id IS NOT NULL
  `);
};

async function migrate008() {
  console.log('  → Applying migration 008 (Phase 3 Offers & Transactions)...');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        version    INTEGER UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await query('SELECT id FROM schema_migrations WHERE version = $1', [8]);
    if (existing.rows.length > 0) {
      console.log('  ✓ Migration 008 already applied');
      return;
    }

    await up();

    await query('INSERT INTO schema_migrations (version) VALUES ($1)', [8]);
    console.log('  ✓ Migration 008 applied');
  } catch (err) {
    console.error('  ✗ Migration 008 failed:', err);
    throw err;
  }
}

export default migrate008;
export { up };
