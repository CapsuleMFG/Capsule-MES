# MES Phase 1: Auth, Production Dashboard & Reporting

**Date:** 2026-03-18
**Status:** Approved
**Scope:** User authentication with role-based access, real-time production dashboard, and reporting/export capabilities.

---

## Context

Capsule ERP is an internal MES for a manufacturing team of 10+ users spanning operators, engineers, production managers, and office staff. The system has a solid foundation (job management, 4-stage workflow, parts tracking, kiosk, supply chain) but lacks user authentication, a real-time production view, and data export capabilities. These three features are the highest priority to make the system deployable.

**Build order:** Auth → Production Dashboard → Reporting/Export

Auth is the foundation — it unblocks kiosk deployment, audit trails, and role-gated access for everything else.

---

## 1. User Authentication & Role-Based Access

### 1.1 Auth Provider

Use **Supabase Auth** (already the project's database provider). Email/password authentication — no OAuth needed for internal use.

- Supabase handles password hashing, JWT issuance, token refresh, and session management
- Backend validates JWTs on every API request via middleware
- Frontend stores session via Supabase client SDK (handles refresh automatically)

**New dependencies required:**
- `@supabase/supabase-js` in both `client/` and `server/` packages
- Backend uses `@supabase/supabase-js` to verify JWTs against the project's JWT secret (available in Supabase dashboard under Settings > API)

**Note on database syntax:** The existing migrations use SQLite-style syntax (e.g., `INTEGER PRIMARY KEY AUTOINCREMENT`, `datetime('now')`) that was manually translated for PostgreSQL. New migrations in this spec use native PostgreSQL syntax (`BIGSERIAL`, `TIMESTAMPTZ`, `gen_random_uuid()`). Do not copy syntax from older migration files.

### 1.2 Roles

Four roles with hierarchical permissions:

| Role | Access Level |
|------|-------------|
| **Admin** | Full system access + user management (create/edit/disable users, assign roles) |
| **Manager** | All CRUD on jobs, scheduling, work assignment, clients, suppliers, inventory, reports. Cannot manage users. |
| **Engineer** | Engineering milestones, BOMs, PBOMs, work orders, supply chain views. Cannot delete jobs or manage users/inventory. |
| **Operator** | Kiosk login (PIN), check in/out parts, log quality status, view own assignments. Read-only on jobs list. Cannot edit jobs, manage inventory, or access admin pages. |

### 1.3 Database Schema

**`profiles` table** (extends Supabase `auth.users` — standard Supabase pattern):

Supabase Auth owns `auth.users` (email, password hash, sessions). The `profiles` table stores app-specific fields and references `auth.users.id` as its primary key. Email is NOT duplicated here — it lives in `auth.users`.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, FK to `auth.users(id)` |
| name | text | Display name (shown in audit trail, kiosk, etc.) |
| role | text | One of: admin, manager, engineer, operator |
| pin | text | bcrypt-hashed PIN for kiosk login (operators) |
| is_active | boolean | Soft-disable accounts without deleting |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated |

A database trigger or Supabase webhook auto-creates a `profiles` row when a new `auth.users` record is created (via admin user creation flow).

**`audit_log` table** (append-only):

| Column | Type | Notes |
|--------|------|-------|
| id | bigserial | Primary key |
| user_id | uuid | FK to profiles |
| user_name | text | Denormalized for fast display |
| action | text | CREATE, UPDATE, DELETE |
| table_name | text | Which table was affected |
| record_id | text | ID of the affected record |
| old_values | jsonb | Previous state (null for CREATE) |
| new_values | jsonb | New state (null for DELETE) |
| created_at | timestamptz | Auto-set, immutable |

### 1.4 Backend Implementation

**Auth middleware** (`server/src/middleware/auth.ts`):
- Extracts JWT from `Authorization: Bearer <token>` header
- Validates JWT via Supabase client
- Attaches `req.user = { id, email, name, role }` to request
- Returns 401 if no/invalid token

**Role middleware** (`server/src/middleware/roles.ts`):
- `requireRole(...roles)` — returns 403 if user's role is not in the allowed list
- Applied per-route or per-router

**Route protection map:**

| Routes | Allowed Roles |
|--------|--------------|
| `GET /api/*` (read endpoints) | All authenticated |
| `POST/PUT/DELETE /api/jobs/*` | admin, manager |
| `POST/PUT/DELETE /api/jobs/:id/bom/*`, `/pbom/*` | admin, manager, engineer |
| `POST/PUT /api/jobs/:id/workflow/*` | admin, manager, engineer |
| `POST/PUT /api/tracked-parts/*/checkin`, `/checkout` | All authenticated (operators included) |
| `POST /api/kiosk/auth` | Public (PIN-based, returns limited session) |
| `GET/POST/PUT /api/profiles/*` | admin only |
| `GET /api/audit-log` | admin, manager |
| All other write endpoints | admin, manager |

**Audit logging** (`server/src/middleware/audit.ts`):
- For UPDATE operations: performs a SELECT before the update within the same transaction to capture `old_values`
- For CREATE operations: logs `new_values` only (no `old_values`)
- For DELETE operations: performs a SELECT before delete to capture `old_values` (no `new_values`)
- Writes to `audit_log` on every CREATE, UPDATE, DELETE
- Runs asynchronously (non-blocking — fire and forget, errors logged to `console.error` but don't fail the request). Silent audit failures are acceptable for an internal tool; if this becomes a concern, we can add a retry queue later.

**Auth rollout strategy:**
- Add `AUTH_REQUIRED=true|false` environment variable (default `false` during development)
- When `AUTH_REQUIRED=false`, auth middleware passes all requests through with a default dev user
- When `AUTH_REQUIRED=true`, all endpoints require valid JWT except `POST /api/kiosk/auth`
- This allows gradual rollout: deploy code first, enable auth when ready

### 1.5 Frontend Implementation

**Login page** (`/login`):
- Email + password form
- Redirects to `/` on success
- Shows error on invalid credentials
- No "forgot password" for v1 (admin can reset)

**Auth context** (`client/src/contexts/AuthContext.tsx`):
- Wraps app in `<AuthProvider>`
- Exposes `user`, `login()`, `logout()`, `isAuthenticated`
- Checks Supabase session on mount, handles token refresh

**Protected routes** (`client/src/components/auth/ProtectedRoute.tsx`):
- `<ProtectedRoute roles={["admin","manager"]}>`
- Redirects to `/login` if not authenticated
- Redirects to `/unauthorized` if role not allowed

**Sidebar** updates:
- Only shows pages the current user's role can access
- Shows user name and role at bottom
- Logout button

**User management page** (`/admin/users`) — admin only:
- List all users with name, email, role, active status
- Create new user (email, name, role, optional PIN)
- Edit user (change role, reset PIN, toggle active)
- Cannot delete users (soft-disable via is_active)

### 1.6 Kiosk Integration

Upgrade existing PIN-based kiosk:
- PINs now resolve to a `profiles` record (not standalone `station_kiosks`)
- `POST /api/kiosk/auth` accepts PIN → returns user name, role, and limited kiosk session token
- All part check-in/out/quality actions include `user_id` from the kiosk session
- The `station_kiosks` table is **kept** for station-to-machine mapping (which physical terminal maps to which machine), but PIN authentication moves to the `profiles` table
- Kiosk flow becomes: operator enters PIN → `profiles` lookup validates identity → kiosk UI then uses `station_kiosks` to determine which machine the terminal is configured for
- Existing `operator_name` fields on `part_station_logs` are kept for backward compatibility with historical data; new entries populate both `operator_name` (from `profiles.name`) and `user_id`

---

## 2. Production Dashboard

### 2.1 Page & Routing

New page at `/dashboard/production` with two tabs:
- **Command Center** — information-dense overview for managers
- **Machine Grid** — glanceable machine-by-machine view for floor TVs

Both tabs auto-refresh. No manual refresh button needed.

### 2.2 Command Center Tab

**Layout (top to bottom):**

1. **KPI Bar** (4 cards, single row):
   - Active Jobs (count of jobs with workflow status In Progress)
   - Parts Completed Today (tracked_parts completed where completed_at is today)
   - On-Time Rate (% of completed jobs where actual completed_at <= target_end_date)
   - Blocked Jobs (count of jobs with any workflow stage status = Blocked)

2. **Two-column body:**
   - **Left: Machine Status** — list of all machines with status dot (green=running, amber=idle, red=down), current job if any, operator name if checked in
   - **Right: Job Queue** — active and queued jobs sorted by priority, showing job number, client, description, current stage, status dot

3. **Bottom: Bottleneck Alerts** — auto-generated from:
   - Machines with status "down"
   - Jobs with any stage Blocked
   - Jobs past target end date
   - Displayed as dismissible alert cards with semantic coloring (red=down/blocked, amber=late)

**Refresh:** Every 30 seconds via React Query `refetchInterval`.

### 2.3 Machine Grid Tab

**Layout:** CSS grid of machine cards, responsive (3-4 columns on large screens, 2 on medium).

**Each machine card shows:**
- Machine name (bold, top)
- Status indicator (large dot: green=running, amber=idle, red=down)
- Current job number (or "No job assigned")
- Current part description
- Progress bar: X/Y parts completed for current work order
- Next queued job (if idle)

**Visual treatment:**
- Running machines: standard `border-gray-700`
- Idle machines: standard border, amber status dot
- Down machines: standard `border-gray-700` border, large red status dot, reason text displayed in `text-red-400` (no colored card borders per design system rule 9)

**Full-screen mode:** Button to hide sidebar and header for TV display. Uses CSS to maximize grid area. Persists via localStorage.

**Refresh:** Every 15 seconds via React Query `refetchInterval`.

### 2.4 Backend Endpoints

**`GET /api/dashboard/production`** — returns all data for both tabs in one call:

```typescript
{
  kpis: {
    activeJobs: number;
    partsCompletedToday: number;
    onTimeRate: number;        // 0-100
    blockedJobs: number;
  };
  machines: Array<{
    id: number;
    name: string;
    type: string;
    status: 'running' | 'idle' | 'down';
    currentJob: { id: number; jobNumber: string; description: string } | null;
    currentOperator: string | null;
    currentPart: { description: string; completed: number; total: number } | null;
    nextJob: { id: number; jobNumber: string } | null;
  }>;
  jobQueue: Array<{
    id: number;
    jobNumber: string;
    clientName: string;
    description: string;
    priority: string;
    currentStage: string;
    stageStatus: string;
    targetEndDate: string | null;
  }>;
  bottlenecks: Array<{
    type: 'machine_down' | 'job_blocked' | 'job_overdue';
    message: string;
    severity: 'critical' | 'warning';
    relatedId: number;
  }>;
}
```

**Machine status derivation** (simplified — no deep join chains):
- **Down:** `machines.is_down = true` (manually set by managers via toggle). Takes priority over other statuses.
- **Running:** Machine has at least one work order with `assigned_machine_id = machine.id` AND `production_status = 'In Progress'`. No need to check part-level check-ins — an in-progress work order on a machine means it's running.
- **Idle:** Machine is active (`active = 1`, `is_down = false`) but has no in-progress work orders assigned to it.

**Note on `profiles` table operations:** The `profiles` table uses a UUID primary key (from `auth.users`), not a serial integer. Use `query()` (raw SQL returning rows) for profile inserts/updates instead of the `execute()` helper, which expects numeric `lastID` return values.

**Note on `currentPart`:** If multiple parts are associated with a machine's active work order, show aggregate counts (total completed / total tracked for that work order), not a single part. The `description` field shows the work order description rather than individual part names.

### 2.5 Frontend Components

| Component | Location |
|-----------|----------|
| `ProductionDashboardPage` | `client/src/pages/ProductionDashboardPage.tsx` |
| `CommandCenterTab` | `client/src/components/dashboard/CommandCenterTab.tsx` |
| `MachineGridTab` | `client/src/components/dashboard/MachineGridTab.tsx` |
| `KpiBar` | `client/src/components/dashboard/KpiBar.tsx` |
| `MachineCard` | `client/src/components/dashboard/MachineCard.tsx` |
| `JobQueuePanel` | `client/src/components/dashboard/JobQueuePanel.tsx` |
| `BottleneckAlerts` | `client/src/components/dashboard/BottleneckAlerts.tsx` |

**Hook:** `useProductionDashboard()` in `client/src/hooks/useDashboard.ts` — calls `GET /api/dashboard/production` with `refetchInterval` based on active tab.

---

## 3. Reporting & Export

### 3.1 CSV Export

**Universal export button** added to every data table in the app:
- Jobs list, BOM table, PBOM table, inventory table, purchase orders, tracked parts, labor entries, audit log
- Client-side CSV generation from the currently displayed/filtered data
- Uses a shared `exportToCsv(filename, headers, rows)` utility
- Button placement: top-right of each table, next to any existing filter controls

**Implementation:** No backend changes needed. Export operates on the React Query cache data that's already loaded.

### 3.2 KPI Reports Page

New page at `/reports` (accessible by admin, manager):

**Summary cards (same style as dashboard):**
- Jobs completed this week / this month
- Average cycle time (days from actual start to actual completed)
- On-time delivery rate (% completed before target end date)
- Scrap rate (scrapped parts / total parts, as percentage)
- Total labor hours this week / this month
- Labor hours breakdown by stage (Engineering, WO Release, Materials, Production)

**Date range filter:** Dropdown for "This Week", "This Month", "Last 30 Days", "Last 90 Days", "All Time". All KPIs recalculate based on selected range.

**Backend endpoint:** `GET /api/reports/kpis?from=YYYY-MM-DD&to=YYYY-MM-DD`

```typescript
{
  jobsCompleted: number;
  avgCycleTimeDays: number;
  onTimeRate: number;
  scrapRate: number;
  totalLaborHours: number;
  laborByStage: Record<string, number>;
}
```

### 3.3 Audit Log Viewer

New page at `/admin/audit-log` (accessible by admin, manager):

- Table: timestamp, user name, action (CREATE/UPDATE/DELETE), table, record ID
- Expandable rows showing old/new values as JSON diff
- Filters: by user, by action type, by table, by date range
- Paginated (50 per page)
- CSV export button

**Backend endpoint:** `GET /api/audit-log?user=&action=&table=&from=&to=&page=&limit=`

---

## 4. Database Migrations

All migrations are additive (no drops, no renames).

### Migration 027: Profiles table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'engineer', 'operator')),
  pin TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_pin ON profiles(pin) WHERE pin IS NOT NULL;

-- Auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'operator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Migration 028: Audit log table
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

### Migration 029: Machine status fields
```sql
ALTER TABLE machines ADD COLUMN is_down BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN down_reason TEXT;
ALTER TABLE machines ADD COLUMN down_since TIMESTAMPTZ;
```

### Migration 030: Link tracked parts and labor to profiles
```sql
ALTER TABLE part_station_logs ADD COLUMN user_id UUID REFERENCES profiles(id);
ALTER TABLE job_labor ADD COLUMN user_id UUID REFERENCES profiles(id);
```
Note: `part_station_logs.operator_name` is kept for historical data. New entries populate both `operator_name` and `user_id`.

---

## 5. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth provider | Supabase Auth | Already using Supabase for DB; eliminates custom password/session management |
| Session storage | Supabase JS client (localStorage) | Standard for SPAs; handles refresh automatically |
| Machine status | Derived from work orders + manual `is_down` flag | No need for a separate status table; real-time derivation is accurate enough at 15-30s refresh |
| CSV export | Client-side generation | No backend needed; operates on already-loaded data; fast for table sizes under 10k rows |
| Audit logging | Async middleware | Non-blocking; audit failures don't break business operations |
| Kiosk migration | PIN on profiles table, station_kiosks kept for machine mapping | Consolidates identity; one profile = one person across web + kiosk; station hardware config stays separate |

---

## 6. Out of Scope (v1)

- OAuth / SSO integration
- Forgot password / self-service password reset
- Real-time WebSocket updates (polling is sufficient for 15-30s refresh)
- Chart/graph visualizations (tables and numbers are sufficient for v1)
- PDF report generation
- Mobile-responsive layouts (desktop and TV are the targets)
- Row-level security in Supabase (app-level role checks are sufficient for internal use)
- Automated alerts/notifications (email, Slack, etc.)
