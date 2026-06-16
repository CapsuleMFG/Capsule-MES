# Capsule MES — Manufacturing Execution System

A full-stack MES for tracking work end-to-end across the shop floor: **Engineering →
Supply Chain → Production (stations / machines / parts) → Shipping**. Built for a small
team (~20 users) with office logins and PIN-based station kiosks on the floor.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue)

> **Note on docs:** Earlier revisions of this README described a SQLite/sql.js, 4-stage,
> dark-theme prototype. That is no longer accurate — the app runs on Supabase PostgreSQL,
> has full auth, and a light design system. See [`docs/COMPLETION_PLAN.md`](docs/COMPLETION_PLAN.md)
> for current state and remaining work.

## Features

- **Jobs & workflow** — jobs with auto-generated numbers (`CAP-YYYY-XXX`), tracked through
  workflow stages (Engineering, WO Release, Materials, Production) with per-stage status.
- **Engineering** — design milestones, BOM and production-BOM (PBOM) management, Excel BOM
  import, work-order PDF upload + parse → auto-create tracked parts, send-to-production.
- **Supply chain** — procurement, global inventory, suppliers, purchase orders,
  drag-to-reorder job priorities.
- **Production & parts tracking** — generic **tracked parts** flowing through **route
  templates** (ordered station sequences), per-station check-in/out with quality gates and
  barcode/tracking-ID lookup, scrap/recut handling.
- **Scheduling board** — drag-and-drop kanban of schedule entries per machine, with
  position ordering and route-step dependency enforcement.
- **Machines** — machine registry, status (running / idle / down), downtime events, and OEE.
- **Station kiosks** — PIN login on floor PCs issuing short-lived JWTs; operators see only
  their station's queue.
- **Shipping** — shipments with status workflow (Pending → Packing → Packed → Shipped →
  Delivered), carrier/tracking, packing list.
- **Dashboards & reporting** — main metrics dashboard, production dashboard (Command Center
  + Machine Grid + Downtime), KPI reports with CSV export, audit log viewer.
- **Auth & admin** — Supabase email/password login, forgot/reset password, idle timeout,
  rate-limit lockout, role-based access control, user management.

## Tech Stack

**Frontend** (`client/`, port 5173)
- React 19 + TypeScript, Vite 7
- Tailwind CSS 3, Phosphor Icons, Geist font
- TanStack React Query 5 (data fetching + polling), React Router 6
- `@dnd-kit` (drag-and-drop), React Hook Form + Zod, Axios, `@supabase/supabase-js`

**Backend** (`server/`, port 3001)
- Node.js 20 + Express + TypeScript
- `pg` connection pool → Supabase **PostgreSQL**
- Supabase Auth (web logins) + custom kiosk JWT (`jsonwebtoken`)
- Helmet, CORS, `express-rate-limit`, `express-validator`, Winston, Multer, `xlsx`,
  `pdf-parse`, `bcrypt`

**Shared** (`shared/`) — TypeScript types shared between client and server.

## Architecture

```
Capsule-MES/
├── client/      # React 19 + Vite SPA (deployed to Vercel — see client/vercel.json)
│   └── src/
│       ├── components/   # layout, ui, auth, feature components
│       ├── contexts/     # Auth, Kiosk, Toast providers
│       ├── pages/        # route-level screens (incl. pages/kiosk/*)
│       ├── hooks/        # React Query hooks (polling 10–60s on live views)
│       ├── services/     # Axios API client
│       └── lib/          # supabase client
├── server/      # Express API (deployed to Render — see render.yaml)
│   └── src/
│       ├── controllers/  # request handlers (per domain)
│       ├── routes/        # route definitions, mounted under /api
│       ├── middleware/    # auth, roles, operatorScope, audit, validate, upload
│       ├── models/        # database.ts (pg pool + query helpers)
│       └── lib/           # supabase admin client, logger, validation, notifications
│   └── database/migrations/  # historical SQL — see "Database" below
└── shared/types/
```

### Roles

Five roles, enforced server-side via `requireRole(...)` and an operator station-scope
middleware: `admin`, `manager`, `engineer`, `supply_chain`, `operator`. Operators (kiosk)
are restricted to their own station's parts and jobs. Office roles log in with
email/password; operators authenticate by station PIN.

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (PostgreSQL database + Auth)

## Setup

```bash
git clone https://github.com/CapsuleMFG/Capsule-MES.git
cd Capsule-MES

# Backend
cd server && npm install

# Frontend (in a second terminal)
cd client && npm install
```

### Environment variables

**Backend — `server/.env`**
```env
PORT=3001
NODE_ENV=development
AUTH_REQUIRED=false            # set "true" in production (startup guard enforces it)
DATABASE_URL=postgresql://...  # Supabase Postgres connection string
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...  # server-side admin key (never expose to the client)
SUPABASE_JWT_SECRET=...
KIOSK_JWT_SECRET=...           # signs/verifies station-kiosk JWTs
CORS_ORIGINS=http://localhost:5173
```
> In non-production with `AUTH_REQUIRED` unset/false, the API uses a dev-bypass admin user
> so you can work without logging in. The production startup guard refuses to boot unless
> `AUTH_REQUIRED=true`.

**Frontend — `client/.env`**
```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=...     # public anon key
```

## Running

```bash
# Backend (port 3001) — API under http://localhost:3001/api
cd server && npm run dev

# Frontend (port 5173)
cd client && npm run dev
```

## Database

The schema lives in **Supabase PostgreSQL** and is accessed via a `pg` pool
(`server/src/models/database.ts`). Key tables: `jobs`, `workflow_stages`, `clients`,
`work_orders`, `bom_items`, `pbom_items`, `tracked_parts`, `route_templates` /
`route_template_steps`, `part_station_logs`, `machines`, `machine_downtime_events`,
`station_kiosks`, `schedule_entries`, `shipments`, `suppliers`, `global_inventory`,
`purchase_orders`, `job_procurement`, `profiles`, `audit_log`, `notifications`.

> ⚠️ **No migration runner yet.** The files in `server/database/migrations/` are a
> historical record (the early ones use SQLite syntax and do not run on Postgres); the live
> schema was created out-of-band in Supabase. There is currently no automated, repeatable
> way to apply a schema change. Establishing a schema source-of-truth + migration runner is
> the first foundation task in [`docs/COMPLETION_PLAN.md`](docs/COMPLETION_PLAN.md).

## Screens (routes)

Public: `/login`, `/forgot-password`, `/reset-password`. Kiosk (standalone, PIN):
`/kiosk`, `/kiosk/machine`, `/kiosk/station`.

Protected app: `/` (Dashboard), `/jobs`, `/jobs/:id`, `/engineering`, `/supply-chain`,
`/production`, `/parts`, `/parts/:id`, `/route-templates`, `/station-kiosks`, `/shipping`,
`/clients`. Manager/admin only: `/dashboard/production`, `/scheduling`, `/reports`,
`/admin/audit-log`. Admin only: `/admin/users`.

## Testing

```bash
cd server && npm test     # vitest (auth, workflow, route smoke tests)
```

## Deployment

- **API** → Render (`render.yaml`). Requires the backend env vars above; `AUTH_REQUIRED`
  is set to `true`.
- **Client** → Vercel (`client/vercel.json`).

## Design System

Light **"Soft Structural"** theme — white cards, `bg-gray-100` page, soft-tinted semantic
pill badges, single primary action color (`bg-gray-900`), Geist font, Phosphor icons. The
authoritative spec is [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); follow it on every UI change.

## License

MIT
