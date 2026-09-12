# AgariyaCare AI — Database Migration Guide

## PostgreSQL Schema

Run these migrations to set up a production database.

```sql
-- Workers
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  worker_id TEXT UNIQUE NOT NULL,
  age INTEGER,
  gender TEXT,
  location TEXT,
  occupation TEXT,
  experience_years INTEGER DEFAULT 0,
  family_size INTEGER DEFAULT 1,
  annual_income NUMERIC DEFAULT 0,
  is_gujarat_resident BOOLEAN DEFAULT false,
  is_bpl BOOLEAN DEFAULT false,
  has_disability BOOLEAN DEFAULT false,
  housing_status TEXT DEFAULT 'rented',
  has_bank_account BOOLEAN DEFAULT false,
  has_aadhaar BOOLEAN DEFAULT false,
  is_registered_worker BOOLEAN DEFAULT false,
  has_health_insurance BOOLEAN DEFAULT false,
  salt_production NUMERIC DEFAULT 0,
  role TEXT DEFAULT 'worker',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcare requests
CREATE TABLE healthcare_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  worker_name TEXT,
  symptoms TEXT[],
  description TEXT,
  severity TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'PENDING',
  assigned_to TEXT,
  scheduled_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcare camps
CREATE TABLE healthcare_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  date DATE,
  time TEXT,
  services TEXT[],
  contact TEXT,
  capacity INTEGER DEFAULT 100,
  registered INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Salt price entries
CREATE TABLE salt_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT,
  location TEXT,
  salt_type TEXT,
  quality_grade TEXT,
  price_per_tonne NUMERIC,
  buyer TEXT,
  date DATE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  source TEXT
);

-- Welfare schemes
CREATE TABLE welfare_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  eligibility_criteria TEXT[],
  required_documents TEXT[],
  application_method TEXT,
  official_source_url TEXT,
  last_verified DATE,
  is_active BOOLEAN DEFAULT true
);

-- Safety readings
CREATE TABLE safety_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  temperature NUMERIC,
  humidity NUMERIC,
  heat_index NUMERIC,
  working_duration_hours NUMERIC DEFAULT 0,
  water_availability TEXT DEFAULT 'SUFFICIENT',
  rest_breaks_taken INTEGER DEFAULT 0,
  safety_level TEXT DEFAULT 'NORMAL',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'MANUAL'
);

-- Safety incidents
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  worker_name TEXT,
  type TEXT,
  description TEXT,
  severity TEXT,
  location TEXT,
  status TEXT DEFAULT 'REPORTED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety alerts
CREATE TABLE safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  message TEXT,
  affected_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Community notices
CREATE TABLE community_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  author TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support requests
CREATE TABLE support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  worker_name TEXT,
  category TEXT,
  subject TEXT,
  description TEXT,
  status TEXT DEFAULT 'OPEN',
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES workers(id),
  category TEXT,
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Switching to PostgreSQL

1. Install `pg` package in backend: `npm install pg @types/pg`
2. Create `backend/src/repositories/postgres.repositories.ts`
3. Implement each interface from `repositories/interfaces.ts` using `pg` client
4. Update `repositories/index.ts` to use Postgres implementations
5. Set `DATABASE_URL` in `.env`
