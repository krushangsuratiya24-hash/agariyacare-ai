# AgariyaCare AI

> **"Sell Better. Work Safer. Live Better."**
>
> A platform for Agariya salt-pan workers in the Little Rann of Kutch, Gujarat.
> Powered by **IBM Granite AI** (via IBM watsonx).

---

## Overview

AgariyaCare AI is a full-stack web application designed to support the Agariya community — salt-pan workers in the Little Rann of Kutch, Gujarat, India. The platform provides:

- **Salt Marketplace** — Workers list salt inventory; buyers browse, make offers, and negotiate
- **AI Assistant** — IBM Granite-powered AI with real database context (inventory, offers, welfare, safety, healthcare)
- **Healthcare Support** — Workers submit healthcare requests; coordinators manage and respond
- **Safety Monitoring** — Heat index tracking, incident reporting, SOS/emergency alerts
- **Welfare Schemes** — Government scheme matching and guidance
- **Bilingual** — Full English and Gujarati (ગુજરાતી) support

---

## Architecture

```
agariyacare/
├── backend/           # Node.js + Express + TypeScript
│   └── src/
│       ├── index.ts              # Entry point, middleware, all routes
│       ├── agents/               # AI agents + orchestrator
│       ├── controllers/          # Marketplace, Offers, Auth, User controllers
│       ├── db/
│       │   ├── migrations/       # Incremental SQL migrations (007–010)
│       │   ├── pool.ts           # PostgreSQL connection pool
│       │   └── runMigrations.ts  # Migration runner (auto-runs on startup)
│       ├── middleware/           # Auth (JWT + HttpOnly cookies), error handling
│       ├── providers/ai/         # IBM Granite provider + development fallback
│       ├── repositories/         # Data access layer (PostgreSQL + dev fallback)
│       ├── routes/               # 17 Express route files
│       └── types/                # Shared TypeScript types
│
└── frontend/          # React + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── App.tsx               # Router, auth initialization
        ├── context/authStore.ts  # Zustand auth store (persisted)
        ├── contexts/             # LanguageContext, AuthContext (compatibility shim)
        ├── components/           # Layout, UI, Profile, Auth components
        ├── pages/                # All page components
        ├── services/api.ts       # API client (Axios + Bearer token)
        └── i18n/locales/         # en.json + gu.json translations
```

---

## Roles

| Role | Description |
|------|-------------|
| `AGARIYA_WORKER` | Salt-pan worker. Can manage inventory, listings, offers, transactions, submit healthcare/safety requests |
| `BUYER` | Salt buyer. Can browse marketplace, save listings, make and negotiate offers, track purchases |
| `COORDINATOR` | Field coordinator. Can view and manage healthcare/safety requests, SOS events, post notices |
| `ADMIN` | Administrator. Full access including dispute resolution and system management |

---

## Features

### Marketplace
- Salt inventory management
- Listing creation with price, quantity, grade, location
- Public marketplace with search and filters
- Buyer requests system
- Saved listings
- Real-time offer negotiation (offer → counter-offer → accept/reject)
- Transaction lifecycle (AGREED → PROCESSING → DISPATCHED → DELIVERED → COMPLETED)
- Inventory reservation on accepted offers
- Notifications at each step

### AI Assistant
- IBM Granite-powered (via watsonx.ai)
- Specialized agents: Marketplace, Healthcare, Welfare, Safety, Community, Salt Price
- Real database context injected into prompts
- Conversation history persisted to PostgreSQL
- Development fallback when IBM credentials not configured (clearly labeled)
- Bilingual (English / Gujarati)

### Healthcare
- Worker submits healthcare request with symptoms and severity
- Coordinator sees all requests, updates status, adds notes
- Full status workflow: SUBMITTED → REVIEWING → REFERRED → SCHEDULED → RESOLVED → CLOSED
- Healthcare camps listing
- Notifications at status changes
- Safety disclaimer: not a doctor, emergency → call 108

### Safety
- Heat index tracking (temperature + humidity + working hours)
- Safety level: SAFE → CAUTION → HIGH_RISK → EMERGENCY
- Incident reporting
- Safety alerts (system-wide)
- SOS emergency activation → immediate coordinator notification
- Coordinator management of incidents and SOS events
- Safety disclaimer: not a replacement for emergency services, call 108 in emergencies

### Welfare
- Government scheme database
- Worker eligibility matching

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### 1. Clone the repository

```bash
git clone https://github.com/your-org/agariyacare-ai.git
cd agariyacare-ai
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secrets
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Start development

**Backend** (terminal 1):
```bash
cd backend
npm run dev
```

**Frontend** (terminal 2):
```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173`, the backend at `http://localhost:5000`.

---

## PostgreSQL Setup

### Create the database

```sql
CREATE DATABASE agariyacare;
```

### Migrations

Migrations run automatically on backend startup. They are incremental and idempotent (safe to re-run).

Migration order:
- `006` — Core tables (users, profiles, marketplace stubs)
- `007` — Phase 2 marketplace columns and indexes
- `008` — Phase 3 offers, transactions, negotiation history
- `009` — Phase 4 AI conversations and messages
- `010` — Phase 5 healthcare, safety, emergency tables

To run manually:
```bash
cd backend
npx ts-node src/db/runMigrations.ts
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) |
| `COOKIE_SECRET` | Secret for cookie signing |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `PORT` | Backend port (default: 5000) |

### IBM Granite AI

| Variable | Description |
|----------|-------------|
| `IBM_WATSONX_API_KEY` | IBM Cloud API key |
| `IBM_WATSONX_PROJECT_ID` | watsonx.ai project ID |
| `IBM_WATSONX_URL` | watsonx API endpoint (default: `https://us-south.ml.cloud.ibm.com`) |
| `IBM_GRANITE_MODEL` | Granite model ID (default: `ibm/granite-13b-chat-v2`) |

### Optional

| Variable | Description |
|----------|-------------|
| `WEATHER_API_KEY` | OpenWeatherMap key for live temperature data |
| `EMERGENCY_CONTACT_PHONE` | Emergency phone number shown in SOS (default: `108`) |

---

## IBM Granite Configuration

1. Sign in to [IBM Cloud](https://cloud.ibm.com)
2. Create a [watsonx.ai project](https://dataplatform.cloud.ibm.com)
3. Generate an API key at [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys)
4. Copy your Project ID from watsonx.ai → Manage → General
5. Set `IBM_WATSONX_API_KEY`, `IBM_WATSONX_PROJECT_ID` in `backend/.env`

### Development Mode (no IBM credentials)

When IBM credentials are not configured:
- The backend uses a `Development AI Provider` 
- It explicitly identifies itself as development mode in all responses
- It uses real database context (your inventory, offers, etc.)
- It does **not** pretend to be IBM Granite
- The frontend displays a development mode notice

---

## Production Build

### Backend

```bash
cd backend
npm run build
# Compiled to backend/dist/
node dist/index.js
```

### Frontend

```bash
cd frontend
npm run build
# Built to frontend/dist/
# Serve with nginx, Caddy, or any static file server
```

### Docker (full stack)

```bash
docker-compose up --build
```

---

## Deployment

### Environment checklist before deploying

- [ ] Set `NODE_ENV=production`
- [ ] Set a strong `JWT_SECRET` (32+ random characters)
- [ ] Set a strong `COOKIE_SECRET`  
- [ ] Set `DATABASE_URL` to your PostgreSQL instance
- [ ] Set `FRONTEND_URL` to your production domain
- [ ] (Optional) Configure IBM Granite credentials for real AI
- [ ] Ensure the `uploads/` directory is writable or use cloud storage

### Reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT authentication with 7-day expiry
- HttpOnly cookies for token storage
- RBAC enforced on all backend routes (not just frontend guards)
- Rate limiting: 20 requests/15min (auth), 200 (general), 30 (AI)
- Helmet security headers
- CORS restricted to `FRONTEND_URL`
- Input validation with express-validator
- Parameterized SQL queries (no string interpolation)
- File upload restrictions (type, size)
- No secrets committed to Git (use `.env.example` for templates)

---

## Phases Completed

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Authentication, PostgreSQL, RBAC, profiles, onboarding, i18n | ✅ Complete |
| Phase 2 | Real Salt Marketplace (inventory, listings, buyer requests, search/filter) | ✅ Complete |
| Phase 3 | Offers, negotiation, counter-offers, transactions, inventory reservation | ✅ Complete |
| Phase 4 | IBM Granite AI integration, AI agents, conversation history | ✅ Complete |
| Phase 5 | Healthcare, safety monitoring, SOS emergency, coordinator workflow | ✅ Complete |
| Phase 6 | Final integration, production readiness, security, UI polish, i18n completion | ✅ Complete |

---

## Development Accounts

When running without a database, the development seed creates these test accounts:

| Email | Password | Role |
|-------|----------|------|
| `worker@test.local` | `worker123` | AGARIYA_WORKER |
| `buyer@test.local` | `buyer123` | BUYER |
| `coordinator@test.local` | `coord123` | COORDINATOR |
| `admin@test.local` | `admin123` | ADMIN |

> **Note:** These only exist in development (in-memory) mode. In production with a real database, create accounts via `/signup`.

---

## API Health Check

```
GET /api/health
→ { "success": true, "message": "AgariyaCare API is running", "timestamp": "..." }
```

---

## License

This project is licensed under the MIT License.
