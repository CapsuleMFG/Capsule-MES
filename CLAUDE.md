# Capsule MES — Project Context

Context for any agent working in this repo. Read before making changes.

> **This file was rewritten on 2026-06-16 to match the actual codebase.** Prior versions
> described a SQLite/sql.js, 4-stage, dark-theme prototype and a 9-teammate orchestration
> model — all stale. The current reality is below. For current state and remaining work,
> see [`docs/COMPLETION_PLAN.md`](docs/COMPLETION_PLAN.md).

---

## What this is

A full-stack **Manufacturing Execution System** for a ~20-person shop, tracking work
end-to-end: **Engineering → Supply Chain → Production (stations / machines / parts) →
Shipping**. Office users log in with email/password; floor operators authenticate at
station kiosks with a PIN.

## Stack

- **Codebase root:** `Capsule-MES/` (was `capsule-erp` — fully renamed).
- **Frontend** (`client/`, port 5173): React 19 · TypeScript · Vite 7 · Tailwind 3 ·
  TanStack React Query 5 · React Router 6 · `@dnd-kit` · React Hook Form + Zod · Axios ·
  Phosphor Icons · Geist font · `@supabase/supabase-js`.
- **Backend** (`server/`, port 3001): Node 20 · Express · TypeScript · `pg` pool →
  **Supabase PostgreSQL** · Supabase Auth + custom kiosk JWT · Helmet · CORS ·
  express-rate-limit · express-validator · Winston · Multer · `xlsx` · `pdf-parse` · bcrypt.
- **Shared** (`shared/types/`): types shared across client and server.
- **Deploy:** API → Render (`render.yaml`); client → Vercel (`client/vercel.json`).

## Data layer (important)

- All DB access goes through `server/src/models/database.ts` — a `pg` `Pool` against
  `DATABASE_URL` (Supabase). Use the exported `query` / `queryOne` / `execute` /
  `executeTransaction*` helpers. They accept SQLite-style `?` placeholders and rewrite them
  to `$1, $2, …`; `execute()` auto-appends `RETURNING id` to inserts. `saveDatabase()` is a
  no-op (legacy).
- **There is no migration runner.** `server/database/migrations/*.sql` is a historical
  record — the early files use SQLite syntax and cannot run on Postgres; the live schema was
  created out-of-band in Supabase. Do **not** assume those files reflect the live schema or
  that adding one will apply it. Establishing a schema source-of-truth + runner is the first
  task in the completion plan; until then, schema changes are applied manually in Supabase.

## Schema map (live tables)

- **Jobs/workflow:** `jobs`, `workflow_stages`, `job_workflow_progress`, `clients`,
  `job_labor` (legacy), `job_materials` (legacy).
- **Engineering:** `design_milestones`, `engineers`, `job_engineering`, `work_orders`
  (+ production fields/status), `work_order_files`, `bom_items`, `pbom_items`, `bom_imports`.
- **Supply chain:** `suppliers`, `global_inventory`, `job_procurement`, `purchase_orders`.
- **Production / parts tracking:** `tracked_parts` (**the generic unit** — has `part_number`,
  `description`, `tracking_id`, route + current step, status; *not* pod/panel-specific),
  `route_templates`, `route_template_steps` (⚠️ `station_name` is **free text**, not a FK —
  no `stations` table exists), `part_station_logs`, `station_kiosks`, `schedule_entries`.
- **Machines:** `machines` (+ `is_down`, downtime fields), `machine_downtime_events`.
- **Shipping:** `shipments` (job-level; `packing_list` JSONB).
- **Auth/system:** `profiles` (UUID → `auth.users`, role, pin, is_active), `login_attempts`,
  `audit_log` (append-only CRUD log), `notifications`.

## Auth & roles

- `server/src/middleware/auth.ts` accepts two token types: Supabase Bearer JWT (web users →
  profile lookup) and a kiosk JWT (`type: 'kiosk'`, verified with `KIOSK_JWT_SECRET`).
- **Roles:** `admin | manager | engineer | supply_chain | operator` (see `AuthenticatedUser`
  in `auth.ts`). Enforce with `requireRole(...)` from `middleware/roles.ts`.
  ⚠️ **Known inconsistency:** the `profiles.role` CHECK constraint in migration 027 lists
  only `admin|manager|engineer|operator` (no `supply_chain`). Code/UI use 5 roles. Reconcile
  before relying on it.
- `middleware/operatorScope.ts` restricts the `operator` role to its own station's
  tracked-parts and jobs (whitelist + station-name match). Reference data (machines, workflow
  stages) and notifications are allowed.
- Public paths: `/api/station-kiosks/auth`, `/api/auth/logout`, `/health`.
- **Dev bypass:** when `NODE_ENV !== 'production'` and `AUTH_REQUIRED !== 'true'`, the API
  injects a dev admin user (no login needed). A production startup guard refuses to boot
  unless `AUTH_REQUIRED=true`.

## Routes (client)

- Public: `/login`, `/forgot-password`, `/reset-password`.
- Kiosk (standalone, no chrome): `/kiosk`, `/kiosk/machine`, `/kiosk/station`.
- Protected: `/` (Dashboard), `/jobs`, `/jobs/:id`, `/engineering`, `/supply-chain`,
  `/production`, `/parts`, `/parts/:id`, `/route-templates`, `/station-kiosks`, `/shipping`,
  `/clients`.
- Manager/admin only: `/dashboard/production`, `/scheduling`, `/reports`, `/admin/audit-log`.
  Admin only: `/admin/users`.
- API routes are mounted under `/api` from `server/src/routes/*`, one file per domain, each
  backed by a controller in `server/src/controllers/*`.

## Conventions & constraints

- TypeScript-strict everywhere — avoid `any` without justification.
- Keep existing REST contracts backward-compatible unless a change is explicitly intended.
- Live views poll with React Query (`refetchInterval` 10–60s); there is **no realtime
  subscription layer** (`@supabase/realtime-js` is present but unused).
- Never commit secrets or `console.log` debug noise. Server logging uses Winston (`lib/logger`).
- Audit-sensitive writes via `middleware/audit.ts` (`logAudit`) — pass hardcoded table/column
  names, never user input (identifiers are interpolated).
- **Definition of done:** `npm run build` passes in both `client/` and `server/`; no TS
  errors; `cd server && npm test` (vitest) passes; feature works end-to-end against Supabase.

## Design System

> Authoritative spec: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Follow it on every UI change.

**Theme:** Soft Structural Light — white surfaces, generous border-radius, semantic color only.

### Colors

**Backgrounds:** Page `bg-gray-100` · Cards/panels/sidebar `bg-white` · Hover `bg-gray-50` ·
Card outline `ring-1 ring-black/[0.02]` · Dividers `border-gray-100` · Table rows `border-gray-50`

**Text:** Primary `text-gray-900` · Secondary `text-gray-600` · Muted `text-gray-400` ·
Disabled `text-gray-300`

**Interactive:** Primary action `bg-gray-900 text-white` (hover `bg-gray-800`) ·
Links `text-blue-600` (hover `text-blue-700`) · Focus ring `ring-2 ring-gray-900`

**Semantic (soft-tinted pill badges — never decorative):** Success `bg-emerald-50 text-emerald-700` ·
Warning/In Progress `bg-amber-50 text-amber-700` · Error/Blocked `bg-red-50 text-red-700` ·
Neutral/Not Started `bg-gray-100 text-gray-500`

### Critical Design Rules (enforce on every PR)

1. **No colored icon backgrounds** — icons are `text-gray-400` or semantic color only
2. **No rainbow metric cards** — metric values are `text-gray-900`, never colored
3. **Semantic color only on the meaning-bearing element** — never on surrounding containers
4. **One primary action color** (`bg-gray-900`) for interactive elements
5. **Metric values use `text-3xl`** — not smaller
6. **Use `shadow-sm` for cards, `shadow-xl` for modals** — no `shadow-lg` on cards
7. **Soft-tinted pill badges** — no dot+text pattern, no colored backgrounds on container
8. **No gradient backgrounds**
9. **No colored borders on cards** — use `ring-1 ring-black/[0.02]`
10. **Tables always inside a white card container** with `overflow-hidden`

> Known debt: the OEE cards in the Production Dashboard's Command Center tab still use a dark
> palette (`bg-gray-800`) — they predate the light system and should be migrated.

### Key Component Patterns

- **Cards:** `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5`
- **Primary button:** `bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Secondary button:** `bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Danger button:** `bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Inputs:** `bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 focus:ring-2 focus:ring-gray-900`
- **Sidebar active nav:** `bg-gray-900 text-white rounded-lg px-3 py-2 font-medium`
- **Status badges:** soft-tinted pill — `px-2 py-0.5 rounded-md text-[11px] font-medium` + semantic bg/text colors
- **Table rows:** `text-sm text-gray-600 px-5 py-3 border-b border-gray-50 hover:bg-gray-50`
- **Icons:** `@phosphor-icons/react` weight `light` — nav: 18px, inline: 16px, metrics: 20px

---

## Workflow stages

Jobs progress through 4 seeded `workflow_stages`, each with status
`Not Started | In Progress | Completed | Blocked`:

1. **Engineering** — design milestones, BOM/PBOM
2. **WO Release** — work order released to the floor
3. **Materials** — BOM materials ordered, received, issued
4. **Production** — active manufacturing (scheduling board + kiosk)

**Shipping** exists as its own module/screen (`shipments`), not as a 5th tracked stage.
**Supply Chain** is an app section (procurement/inventory/POs), parallel to WO Release /
Materials — not a workflow stage.

---

*Version-controlled. Keep it accurate — if you change the stack, schema, or routes, update
this file in the same change.*
