# AgariyaCare AI — Phase 1

> **"Sell Better. Work Safer. Live Better."**
>
> A platform for Agariya salt-pan workers in the Little Rann of Kutch, Gujarat.

---

## Architecture

```
agariyacare/
├── backend/          # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── index.ts           # App entry, middleware, routes
│   │   ├── db/
│   │   │   ├── pool.ts        # PostgreSQL connection pool
│   │   │   └── migrate.ts     # Schema migrations (run once)
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT authentication + role authorization
│   │   │   ├── upload.ts      # Multer avatar upload
│   │   │   └── errorHandler.ts
│   │   ├── routes/
│   │   │   ├── auth.ts        # /api/auth/*
│   │   │   ├── users.ts       # /api/users/*
│   │   │   └── admin.ts       # /api/admin/*
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   └── userController.ts
│   │   ├── utils/jwt.ts
│   │   └── types/index.ts
│   └── uploads/avatars/       # Persistent avatar storage
│
└── frontend/         # React + TypeScript + Vite + Tailwind
    └── src/
        ├── App.tsx             # Router + route guards
        ├── i18n/               # English + Gujarati translations
        ├── context/authStore.ts # Zustand auth state
        ├── services/           # API service layer
        ├── components/
        │   ├── ui/             # Reusable UI components
        │   ├── auth/           # Login, Signup, Guards
        │   ├── layout/         # AppLayout, Sidebar, TopNav, BottomNav
        │   ├── onboarding/     # Onboarding flow
        │   └── profile/        # Profile edit page
        └── pages/shared/       # Dashboard, PlaceholderPage
```

---

## Database

### Tables Created (Phase 1)
| Table | Purpose |
|-------|---------|
| `users` | Core user accounts with roles |
| `worker_profiles` | Agariya worker details |
| `buyer_profiles` | Buyer/company details |
| `notifications` | In-app notifications |
| `audit_logs` | Login/logout/profile audit trail |
| `schema_migrations` | Migration tracking |

### Stub Tables (Phase 2+, created in migration)
`salt_inventory`, `salt_listings`, `buyer_requests`, `offers`, `transactions`,
`market_prices`, `chat_conversations`, `chat_messages`, `health_requests`,
`safety_records`, `welfare_schemes`, `community_posts`

---

## Authentication

- **JWT** tokens stored in **HttpOnly cookies** (+ returned in body for clients)
- **bcrypt** password hashing (cost factor 12)
- **Rate limiting** on auth routes (20 req/15min)
- **Role-based authorization** middleware
- Session persistence via cookie + Zustand `persist`
- Audit logging for login/logout/signup/profile changes

---

## User Roles

| Role | Description |
|------|-------------|
| `AGARIYA_WORKER` | Salt-pan workers — sell salt, access healthcare/safety/welfare |
| `BUYER` | Companies/individuals buying salt |
| `COORDINATOR` | Field support coordinators |
| `ADMIN` | Platform administrators |

---

## Pages Created (Phase 1)

| Page | Path | Status |
|------|------|--------|
| Login | `/login` | ✅ Full |
| Signup | `/signup` | ✅ Full |
| Onboarding | `/onboarding` | ✅ Full |
| Dashboard | `/dashboard` | ✅ Full (empty states) |
| Profile | `/profile` | ✅ Full (edit + avatar) |
| My Salt | `/my-salt` | Phase 2 placeholder |
| Salt Market | `/salt-market` | Phase 2 placeholder |
| My Offers | `/my-offers` | Phase 2 placeholder |
| Healthcare | `/healthcare` | Phase 3 placeholder |
| Safety | `/safety` | Phase 3 placeholder |
| Welfare | `/welfare` | Phase 3 placeholder |
| Community | `/community` | Phase 3 placeholder |
| AI Assistant | `/ai` | Phase 4 placeholder |
| Admin Users | `/admin/users` | Phase 1 (basic list) |

---

## How to Run

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Database Setup

Create database:
```sql
CREATE DATABASE agariyacare;
```

### 2. Backend

```bash
cd agariyacare/backend
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets
npm install
npm run migrate     # Run once to create all tables
npm run dev         # Start API server on :5000
```

### 3. Frontend

```bash
cd agariyacare/frontend
npm install
npm run dev         # Start Vite dev server on :5173
```

Open http://localhost:5173

---

## Environment Variables (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | API port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/agariyacare` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-secret-here` |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `COOKIE_SECRET` | Cookie signing secret | `your-cookie-secret` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |
| `UPLOAD_DIR` | Upload directory | `uploads` |
| `MAX_FILE_SIZE` | Max avatar file size (bytes) | `5242880` (5MB) |

---

## API Endpoints (Phase 1)

```
POST   /api/auth/signup              Create account
POST   /api/auth/login               Login
POST   /api/auth/logout              Logout (clears cookie)
GET    /api/auth/me                  Get current user

GET    /api/users/profile            Get full profile + role profile
PATCH  /api/users/profile            Update user fields
PATCH  /api/users/profile/worker     Update worker profile
PATCH  /api/users/profile/buyer      Update buyer profile
POST   /api/users/profile/avatar     Upload avatar photo
POST   /api/users/onboarding/complete Mark onboarding complete
GET    /api/users/notifications      Get notifications
PATCH  /api/users/notifications/:id/read  Mark read

GET    /api/admin/users              List all users (ADMIN only)
PATCH  /api/admin/users/:id/deactivate
PATCH  /api/admin/users/:id/activate
GET    /api/admin/audit-logs

GET    /api/health                   Health check
```

---

## What Remains for Phase 2

- Salt inventory management (add/edit/view salt stock)
- Salt marketplace (create/browse/search listings)
- Buyer requests (post buying needs)
- Offer system (make/counter/accept/reject offers)
- Transaction records
- Market price tracking
- Saved listings
- Notification system for offers
