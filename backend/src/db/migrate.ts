import { query } from './pool';

const migrations = [
  // Migration 001: Core types and users
  `
  CREATE TYPE user_role AS ENUM ('AGARIYA_WORKER', 'BUYER', 'COORDINATOR', 'ADMIN');
  CREATE TYPE language_preference AS ENUM ('en', 'gu');

  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    phone         VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'AGARIYA_WORKER',
    full_name     VARCHAR(255) NOT NULL,
    avatar_url    VARCHAR(500),
    language_pref language_preference NOT NULL DEFAULT 'en',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_role  ON users(role);
  CREATE INDEX idx_users_phone ON users(phone);
  `,

  // Migration 002: Worker profiles
  `
  CREATE TABLE IF NOT EXISTS worker_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    village               VARCHAR(255),
    district              VARCHAR(255),
    state                 VARCHAR(255) DEFAULT 'Gujarat',
    years_experience      INTEGER CHECK (years_experience >= 0 AND years_experience <= 80),
    salt_pan_area_acres   DECIMAL(10,2),
    salt_type             VARCHAR(100),
    annual_production_kg  INTEGER,
    cooperative_member    BOOLEAN DEFAULT FALSE,
    cooperative_name      VARCHAR(255),
    bio                   TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
  CREATE INDEX idx_worker_profiles_district ON worker_profiles(district);
  `,

  // Migration 003: Buyer profiles
  `
  CREATE TABLE IF NOT EXISTS buyer_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name        VARCHAR(255),
    business_type       VARCHAR(100),
    location            VARCHAR(255),
    city                VARCHAR(255),
    state               VARCHAR(255),
    preferred_salt_type VARCHAR(255),
    monthly_demand_kg   INTEGER,
    bio                 TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_buyer_profiles_user_id ON buyer_profiles(user_id);
  `,

  // Migration 004: Notifications
  `
  CREATE TYPE notification_type AS ENUM (
    'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED',
    'LISTING_ENQUIRY', 'TRANSACTION_UPDATE', 'SYSTEM', 'WELFARE_UPDATE'
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL DEFAULT 'SYSTEM',
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
  CREATE INDEX idx_notifications_is_read    ON notifications(is_read);
  CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
  `,

  // Migration 005: Audit logs
  `
  CREATE TYPE audit_action AS ENUM (
    'LOGIN', 'LOGOUT', 'SIGNUP', 'PROFILE_UPDATE', 'PASSWORD_CHANGE',
    'AVATAR_UPLOAD', 'ONBOARDING_COMPLETE', 'ROLE_CHANGE', 'ACCOUNT_DEACTIVATE'
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      audit_action NOT NULL,
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
  CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
  CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
  `,

  // Migration 006: Future tables (schema stubs for Phase 2+)
  `
  -- Salt inventory (Phase 2)
  CREATE TABLE IF NOT EXISTS salt_inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity_kg     DECIMAL(12,2) NOT NULL DEFAULT 0,
    salt_type       VARCHAR(100),
    quality_grade   VARCHAR(20),
    harvest_date    DATE,
    storage_location VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Salt listings (Phase 2)
  CREATE TABLE IF NOT EXISTS salt_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inventory_id    UUID REFERENCES salt_inventory(id),
    quantity_kg     DECIMAL(12,2) NOT NULL,
    price_per_kg    DECIMAL(10,2) NOT NULL,
    salt_type       VARCHAR(100),
    quality_grade   VARCHAR(20),
    location        VARCHAR(255),
    description     TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Buyer requests (Phase 2)
  CREATE TABLE IF NOT EXISTS buyer_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity_kg       DECIMAL(12,2) NOT NULL,
    max_price_per_kg  DECIMAL(10,2),
    salt_type         VARCHAR(100),
    preferred_location VARCHAR(255),
    description       TEXT,
    status            VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    expires_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Offers (Phase 2)
  CREATE TABLE IF NOT EXISTS offers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id    UUID REFERENCES salt_listings(id),
    request_id    UUID REFERENCES buyer_requests(id),
    from_user_id  UUID NOT NULL REFERENCES users(id),
    to_user_id    UUID NOT NULL REFERENCES users(id),
    quantity_kg   DECIMAL(12,2) NOT NULL,
    price_per_kg  DECIMAL(10,2) NOT NULL,
    message       TEXT,
    status        VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Transactions (Phase 2)
  CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id        UUID REFERENCES offers(id),
    seller_id       UUID NOT NULL REFERENCES users(id),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    quantity_kg     DECIMAL(12,2) NOT NULL,
    price_per_kg    DECIMAL(10,2) NOT NULL,
    total_amount    DECIMAL(14,2) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    payment_method  VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Market prices (Phase 2)
  CREATE TABLE IF NOT EXISTS market_prices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salt_type   VARCHAR(100) NOT NULL,
    region      VARCHAR(255),
    price_per_kg DECIMAL(10,2) NOT NULL,
    source      VARCHAR(255),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Chat conversations (Phase 3)
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES users(id),
    participant_b UUID NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Chat messages (Phase 3)
  CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Health requests (Phase 3)
  CREATE TABLE IF NOT EXISTS health_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    coordinator_id UUID REFERENCES users(id),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Safety records (Phase 3)
  CREATE TABLE IF NOT EXISTS safety_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id   UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,
    description TEXT,
    severity    VARCHAR(20),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Welfare schemes (Phase 3)
  CREATE TABLE IF NOT EXISTS welfare_schemes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(255) NOT NULL,
    title_gu      VARCHAR(255),
    description   TEXT,
    description_gu TEXT,
    eligibility   TEXT,
    application_url VARCHAR(500),
    deadline      DATE,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Community posts (Phase 3)
  CREATE TABLE IF NOT EXISTS community_posts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID NOT NULL REFERENCES users(id),
    title       VARCHAR(255),
    body        TEXT NOT NULL,
    post_type   VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
];

async function migrate() {
  console.log('🚀 Running migrations...');
  try {
    // Create migrations tracking table
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        version    INTEGER UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (let i = 0; i < migrations.length; i++) {
      const version = i + 1;
      const existing = await query(
        'SELECT id FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (existing.rows.length > 0) {
        console.log(`  ✓ Migration ${version} already applied`);
        continue;
      }

      console.log(`  → Applying migration ${version}...`);
      await query(migrations[i]);
      await query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );
      console.log(`  ✓ Migration ${version} applied`);
    }

    console.log('✅ All migrations complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
