# AgariyaCare AI — Phase 4 Complete

> **"Sell Better. Work Safer. Live Better."**
>
> A platform for Agariya salt-pan workers in the Little Rann of Kutch, Gujarat.
> Powered by **IBM Granite AI** (via IBM watsonx).

---

## Phases Completed

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Authentication, PostgreSQL, RBAC, profiles, onboarding, i18n | ✅ Complete |
| Phase 2 | Real Salt Marketplace (inventory, listings, buyer requests) | ✅ Complete |
| Phase 3 | Offers, Negotiation & Transactions | ✅ Complete |
| Phase 4 | IBM Granite AI integration, Healthcare, Safety, Welfare, Community, Analytics | ✅ Complete |

---

## Architecture

```
agariyacare/
├── backend/          # Node.js + Express + TypeScript API
│   └── src/
│       ├── index.ts              # App entry, middleware, all routes
│       ├── agents/               # AI agents (marketplace, healthcare, welfare, safety, community, salt-price)
│       │   └── orchestrator.ts   # Intent classification + agent routing
│       ├── providers/ai/
│       │   ├── granite.provider.ts     # IBM Granite via watsonx (production)
│       │   └── development.provider.ts # Fallback dev provider
│       ├── repositories/         # Data access (dev in-memory or PostgreSQL)
│       ├── routes/               # Express route handlers (17 route files)
│       ├── db/migrations/        # Incremental SQL migrations (007–009)
│       ├── middleware/auth.middleware.ts  # JWT authentication
│       └── types/index.ts        # Shared TypeScript types
│
└── frontend/         # React + TypeScript + Vite + Tailwind
    └── src/
        ├── pages/AIAssistantPage.tsx   # AI chat UI with conversation history
        ├── services/api.ts             # Full API client (auth, ai, marketplace, offers, notifications, healthcare, welfare, safety, community, market, analytics)
        └── i18n/locales/               # English + Gujarati translations
```

---

## IBM Granite AI Integration

The AI Assistant uses **IBM Granite** (via IBM watsonx) as the AI model.

### How it works

1. User sends a message in the frontend AI Assistant (`/ai`)
2. Frontend calls `POST /api/ai/chat` with the message, conversation history, and language
3. Backend **orchestrator** classifies intent → routes to the appropriate agent
4. Agent fetches real database context (inventory, offers, etc.) and calls `provider.chat()`
5. Provider sends the system prompt + context + message to **IBM Granite** (or fallback dev provider)
6. Response is returned to the frontend and persisted to PostgreSQL (for authenticated users)

### Provider selection

| Condition | Provider used |
|-----------|---------------|
| `IBM_WATSONX_API_KEY` + `IBM_WATSONX_PROJECT_ID` set | IBM Granite (ibm/granite-13b-chat-v2) |
| Credentials not set | Development AI fallback (context-aware, not real AI) |

### AI Agents

| Agent | Handles |
|-------|---------|
| `MarketplaceAgent` | Inventory, listings, offers, sales, earnings |
| `HealthcareAgent` | Symptoms, health camps, medical requests |
| `WelfareAgent` | Government scheme matching, eligibility |
| `SafetyAgent` | Heat risk assessment, safety levels, incident reporting |
| `CommunityAgent` | Notices, support requests |
| `SaltPriceAgent` | Market prices, price trends |

---

## Database

### Tables (PostgreSQL)

| Migration | Tables |
|-----------|--------|
| 007 | `salt_types`, `salt_grades`, `salt_inventory`, `salt_listings`, `buyer_requests`, `saved_listings`, `market_prices` |
| 008 | `offers`, `offer_history`, `transactions` |
| 009 (Phase 4) | `ai_conversations`, `ai_messages` |

---

## User Roles

| Role | Description |
|------|-------------|
| `AGARIYA_WORKER` | Salt-pan workers — sell salt, access healthcare/safety/welfare |
| `BUYER` | Companies/individuals buying salt |
| `COORDINATOR` | Field support coordinators |
| `ADMIN` | Platform administrators |

---

## How to Run

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (optional — app works without it using dev repositories)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, and optionally IBM_WATSONX_API_KEY
npm install
npm run dev         # Starts API server on :5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev         # Starts Vite dev server on :5173
```

Open http://localhost:5173

---

## Environment Variables (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default: `5000`) |
| `DATABASE_URL` | No | PostgreSQL connection string — if omitted, uses in-memory dev repos |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `COOKIE_SECRET` | No | Cookie signing secret |
| `FRONTEND_URL` | No | CORS origin (default: `http://localhost:5173`) |
| `IBM_WATSONX_API_KEY` | Phase 4 AI | IBM watsonx API key for Granite AI |
| `IBM_WATSONX_PROJECT_ID` | Phase 4 AI | IBM watsonx project ID |
| `IBM_WATSONX_URL` | No | watsonx endpoint (default: `https://us-south.ml.cloud.ibm.com`) |
| `IBM_GRANITE_MODEL` | No | Granite model ID (default: `ibm/granite-13b-chat-v2`) |

---

## API Endpoints (Phase 4)

```
# Auth
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Users / Profiles
GET    /api/users/profile
PATCH  /api/users/profile
PATCH  /api/users/profile/worker
PATCH  /api/users/profile/buyer

# Marketplace
GET    /api/marketplace/listings
GET    /api/marketplace/inventory            (auth: AGARIYA_WORKER)
POST   /api/marketplace/listings             (auth: AGARIYA_WORKER)
GET    /api/marketplace/buyer-requests

# Offers & Transactions
GET    /api/offers/my                        (auth)
POST   /api/offers                           (auth: BUYER)
POST   /api/offers/:id/accept                (auth)
POST   /api/offers/:id/counter               (auth)
GET    /api/offers/transactions/my           (auth)

# Phase 4 — AI Assistant
POST   /api/ai/chat                          (optional auth)
GET    /api/ai/status
GET    /api/ai/conversations                 (auth)
POST   /api/ai/conversations                 (auth)
GET    /api/ai/conversations/:id/messages    (auth)
PATCH  /api/ai/conversations/:id             (auth)
DELETE /api/ai/conversations/:id             (auth)

# Phase 4 — Healthcare / Safety / Welfare / Community
GET    /api/healthcare/requests
POST   /api/healthcare/requests
GET    /api/healthcare/camps
GET    /api/safety/readings
POST   /api/safety/readings
GET    /api/safety/incidents
POST   /api/safety/incidents
GET    /api/safety/alerts
GET    /api/welfare/schemes
POST   /api/welfare/match
GET    /api/community/notices
POST   /api/community/support

# Phase 4 — Market & Analytics
GET    /api/market/prices/latest
GET    /api/market/trends
POST   /api/market/compare
GET    /api/analytics/summary
GET    /api/analytics/safety
GET    /api/analytics/healthcare

# Notifications
GET    /api/notifications/:userId
GET    /api/notifications/:userId/unread
PUT    /api/notifications/:id/read
PUT    /api/notifications/user/:userId/read-all

GET    /api/health
```
