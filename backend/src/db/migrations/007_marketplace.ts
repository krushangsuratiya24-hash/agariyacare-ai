/**
 * Migration 007 — Phase 2 Marketplace
 *
 * The Phase 1 migration (006) already created stub tables for:
 *   salt_inventory, salt_listings, buyer_requests, offers, transactions, market_prices
 *
 * This migration:
 *   1. Adds missing columns to those stubs (idempotently via IF NOT EXISTS).
 *   2. Creates the saved_listings table.
 *   3. Adds all necessary indexes.
 *
 * All statements are idempotent — safe to re-run.
 */

import { query } from '../pool';

const up = async (): Promise<void> => {
  // ── salt_inventory: add missing columns ────────────────────────────────────
  await query(`ALTER TABLE salt_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'`);
  await query(`ALTER TABLE salt_inventory ADD COLUMN IF NOT EXISTS season VARCHAR(100)`);
  await query(`ALTER TABLE salt_inventory ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2)`);
  await query(`ALTER TABLE salt_inventory ADD COLUMN IF NOT EXISTS moisture_pct DECIMAL(5,2) CHECK (moisture_pct >= 0 AND moisture_pct <= 100)`);
  // Ensure quantity can't be negative
  // (Constraint names must be unique; guard with a DO block)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'salt_inventory_quantity_non_negative'
      ) THEN
        ALTER TABLE salt_inventory ADD CONSTRAINT salt_inventory_quantity_non_negative CHECK (quantity_kg >= 0);
      END IF;
    END $$
  `);

  // ── salt_listings: add missing columns ─────────────────────────────────────
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS min_quantity_kg DECIMAL(12,2) DEFAULT 100`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS available_date  DATE`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS image_urls      TEXT[] DEFAULT '{}'`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS views_count     INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS village         VARCHAR(255)`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS district        VARCHAR(255)`);
  await query(`ALTER TABLE salt_listings ADD COLUMN IF NOT EXISTS season          VARCHAR(100)`);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'salt_listings_quantity_positive'
      ) THEN
        ALTER TABLE salt_listings ADD CONSTRAINT salt_listings_quantity_positive CHECK (quantity_kg > 0);
      END IF;
    END $$
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'salt_listings_price_positive'
      ) THEN
        ALTER TABLE salt_listings ADD CONSTRAINT salt_listings_price_positive CHECK (price_per_kg > 0);
      END IF;
    END $$
  `);

  // ── buyer_requests: add missing columns ────────────────────────────────────
  await query(`ALTER TABLE buyer_requests ADD COLUMN IF NOT EXISTS required_date  DATE`);
  await query(`ALTER TABLE buyer_requests ADD COLUMN IF NOT EXISTS quality_notes  TEXT`);
  await query(`ALTER TABLE buyer_requests ADD COLUMN IF NOT EXISTS title          VARCHAR(255)`);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'buyer_requests_quantity_positive'
      ) THEN
        ALTER TABLE buyer_requests ADD CONSTRAINT buyer_requests_quantity_positive CHECK (quantity_kg > 0);
      END IF;
    END $$
  `);

  // ── saved_listings ─────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS saved_listings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id  UUID NOT NULL REFERENCES salt_listings(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, listing_id)
    )
  `);

  // ── listing_views ──────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS listing_views (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id  UUID NOT NULL REFERENCES salt_listings(id) ON DELETE CASCADE,
      viewer_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Indexes ────────────────────────────────────────────────────────────────
  const indexes: [string, string][] = [
    ['idx_salt_inventory_worker_id',     'CREATE INDEX IF NOT EXISTS idx_salt_inventory_worker_id     ON salt_inventory(worker_id)'],
    ['idx_salt_inventory_status',        'CREATE INDEX IF NOT EXISTS idx_salt_inventory_status        ON salt_inventory(status)'],
    ['idx_salt_listings_worker_id',      'CREATE INDEX IF NOT EXISTS idx_salt_listings_worker_id      ON salt_listings(worker_id)'],
    ['idx_salt_listings_status',         'CREATE INDEX IF NOT EXISTS idx_salt_listings_status         ON salt_listings(status)'],
    ['idx_salt_listings_salt_type',      'CREATE INDEX IF NOT EXISTS idx_salt_listings_salt_type      ON salt_listings(salt_type)'],
    ['idx_salt_listings_price',          'CREATE INDEX IF NOT EXISTS idx_salt_listings_price          ON salt_listings(price_per_kg)'],
    ['idx_salt_listings_created_at',     'CREATE INDEX IF NOT EXISTS idx_salt_listings_created_at     ON salt_listings(created_at DESC)'],
    ['idx_buyer_requests_buyer_id',      'CREATE INDEX IF NOT EXISTS idx_buyer_requests_buyer_id      ON buyer_requests(buyer_id)'],
    ['idx_buyer_requests_status',        'CREATE INDEX IF NOT EXISTS idx_buyer_requests_status        ON buyer_requests(status)'],
    ['idx_buyer_requests_salt_type',     'CREATE INDEX IF NOT EXISTS idx_buyer_requests_salt_type     ON buyer_requests(salt_type)'],
    ['idx_saved_listings_user_id',       'CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id       ON saved_listings(user_id)'],
    ['idx_saved_listings_listing_id',    'CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id    ON saved_listings(listing_id)'],
    ['idx_listing_views_listing_id',     'CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id     ON listing_views(listing_id)'],
  ];

  for (const [, sql] of indexes) {
    await query(sql);
  }
};

async function migrate007() {
  console.log('  → Applying migration 007 (Phase 2 Marketplace)...');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        version    INTEGER UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const existing = await query('SELECT id FROM schema_migrations WHERE version = $1', [7]);
    if (existing.rows.length > 0) {
      console.log('  ✓ Migration 007 already applied');
      return;
    }

    await up();

    await query('INSERT INTO schema_migrations (version) VALUES ($1)', [7]);
    console.log('  ✓ Migration 007 applied');
  } catch (err) {
    console.error('  ✗ Migration 007 failed:', err);
    throw err;
  }
}

export default migrate007;
export { up };
