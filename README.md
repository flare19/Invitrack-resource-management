# Invitrack

A production-deployed inventory and resource booking management system built as a portfolio project to demonstrate full-stack engineering depth — architecture decisions, database design, access control, concurrent request handling, and cloud deployment.

**Live:** [d3hkxi8aedrplf.cloudfront.net](https://d3hkxi8aedrplf.cloudfront.net) · **Demo Admin account:** `invitrack.admin@gmail.com` / `Admin@123`

---

## What this project demonstrates

The interesting engineering is in the decisions:

- **Concurrent booking conflict prevention** without Redis — using PostgreSQL transaction-scoped advisory locks (`pg_advisory_xact_lock`) inside a `prisma.$transaction` block. The lock is automatically released on commit or rollback, with no leak risk. Redis was explicitly deferred (documented in ADR-018) because the problem didn't exist at this scale and the PostgreSQL primitive was the correct tool.

- **Optimistic locking on inventory items** — every `PATCH /inventory/items/:id` requires the client to submit the current `version` value obtained from a prior GET. The server rejects stale updates with `409 Conflict` and increments `version` atomically on success. Concurrent writers surface conflicts rather than silently overwriting each other.

- **Live access control, not stale JWTs** — roles and permissions are fetched fresh from the database on every authenticated request. Embedding them in the token would mean a role change takes up to 15 minutes to take effect. The extra DB query is the correct tradeoff for a system where access control changes must be immediate.

- **Append-only audit log, fully decoupled** — `audit.events` has no foreign keys to any other schema. Actor email is denormalized so the audit trail survives account deletion. Audit writes are fire-and-forget (`.catch()` only) — an audit failure must never fail the primary operation.

- **Modular monolith with schema-level boundaries** — six PostgreSQL schemas (`auth`, `users`, `inventory`, `bookings`, `audit`, `analytics`) enforce module ownership at the database layer. Cross-module references are fully qualified (`users.profiles`, `auth.accounts`) making coupling visible and intentional.

- **Pre-aggregated analytics** — daily snapshots in the `analytics` schema are computed by a background `node-cron` job at UTC midnight. Dashboard query time is constant regardless of how many inventory transactions or booking records have accumulated.

- **Priority-based booking** — reservation priority is snapshotted from the user's highest-priority role at booking time, not dynamically evaluated. A later role change does not retroactively reorder existing reservations.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript (strict, `exactOptionalPropertyTypes: true`) |
| API | Express |
| ORM | Prisma v6 (pinned — see ADR-020 for why v7 was downgraded) |
| Database | PostgreSQL |
| Frontend | React 19 + Vite 7 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | JWT (15-min access token) + HttpOnly refresh token cookie with rotation |
| OAuth | Passport.js — Google provider |
| Email | Nodemailer + Gmail SMTP |
| Deployment | AWS EC2 (API + PostgreSQL via Docker) · AWS S3 + CloudFront (frontend) |
| CI/CD | GitHub Actions — build, test, migrate, deploy on every push to `main` |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions CI/CD                │
│   lint → tsc → test → build → migrate → deploy      │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
   ┌──────▼──────┐          ┌──────▼──────┐
   │  AWS S3 +   │          │  AWS EC2    │
   │ CloudFront  │          │  t3.small   │
   │  (React SPA)│          │             │
   └─────────────┘          │  ┌────────┐ │
                            │  │ Node   │ │
                            │  │Express │ │
                            │  └───┬────┘ │
                            │      │      │
                            │  ┌───▼────┐ │
                            │  │Postgres│ │
                            │  │(Docker)│ │
                            │  └────────┘ │
                            └─────────────┘
```

The backend and database run in Docker Compose on a single EC2 instance. The React frontend is deployed to S3 and served via CloudFront (HTTPS). The custom backend domain is managed through DuckDNS.

---

## CI/CD Pipeline

Every push to `main` runs the full GitHub Actions pipeline:

1. **Type-check** — `tsc --noEmit` on both backend and frontend
2. **Test** — full integration test suite against a live PostgreSQL test database
3. **Build** — production build of the React frontend (`dist/`)
4. **Migrate** — `prisma migrate deploy` runs on the EC2 instance before the new API version starts
5. **Deploy** — frontend assets synced to S3 + CloudFront cache invalidated; backend container restarted on EC2

Database migrations run before the new API container starts, so schema changes are always in place before the code that depends on them.

---

## Database schema (abbreviated)

```
auth.accounts ──── 1:1 ──── users.profiles
auth.accounts ──── 1:N ──── auth.sessions
auth.accounts ──── M:N ──── users.roles  (via users.account_roles)
users.roles   ──── M:N ──── users.permissions  (via users.role_permissions)
inventory.items ── 1:N ──── inventory.stock_levels
inventory.items ── 1:1 ──── bookings.resources
bookings.resources  1:N ─── bookings.reservations
                            (no FK) ← audit.events (decoupled by design)
```

---

## Key API capabilities

| Domain | Highlights |
|---|---|
| Auth | Register, login, OAuth (Google), email verification, password reset, refresh token rotation, session management |
| Users | RBAC with three roles (admin / manager / employee), fine-grained permissions, role assignment |
| Inventory | Item CRUD with optimistic locking, stock level tracking, immutable transaction ledger, soft delete |
| Bookings | Resource reservation with conflict prevention, priority scheduling, approval workflow |
| Audit | Append-only event log, admin-only read access, decoupled from all other schemas |
| Analytics | Pre-aggregated daily inventory snapshots and booking metrics |

Full API reference: [`docs/api-reference.md`](docs/api-reference.md)

---

## Running locally

**Prerequisites:** Node.js 20+, Docker, PostgreSQL

```bash
# Clone and install
git clone https://github.com/your-username/invitrack.git
cd invitrack

# Backend
cd backend
cp .env.example .env        # fill in your values
npm install
npx prisma migrate dev      # applies all migrations
npm run dev                 # starts on :5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # starts on :5173, proxies /api to :5000
```

---

## Architectural decision log

All major decisions are documented in [`docs/decisions.md`](docs/decisions.md) — 28 ADRs covering everything from why Prisma v6 was pinned, to the OAuth state parameter storage strategy, to why analytics uses pre-aggregated snapshots rather than live queries.

Writing ADRs before implementation, not after, was a discipline enforced throughout the project. The decisions doc is a living document — schema gaps discovered during implementation became ADRs, not silent fixes.

---

## Project structure

```
invitrack/
├── backend/
│   └── src/
│       └── modules/
│           ├── auth/
│           ├── users/
│           ├── inventory/
│           ├── bookings/
│           ├── audit/
│           └── analytics/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── types/
└── docs/
    ├── api-reference.md
    ├── database-schema.md
    ├── decisions.md
    ├── frontend-architecture.md
    └── frontend-routes.md
```

Each backend module owns its types, repository, service, controller, and routes. No module reaches into another module's repository layer.
