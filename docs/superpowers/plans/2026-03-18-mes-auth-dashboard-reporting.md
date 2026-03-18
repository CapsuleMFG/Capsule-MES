# MES Phase 1: Auth, Production Dashboard & Reporting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user authentication with role-based access, a real-time production dashboard, and reporting/CSV export to Capsule ERP.

**Architecture:** Three sequential phases. Phase 1 (Auth) adds Supabase Auth with a `profiles` table, JWT middleware, role-gated routes, login page, and user management. Phase 2 (Dashboard) adds a dual-tab production dashboard with Command Center and Machine Grid views. Phase 3 (Reporting) adds CSV export to all tables and a KPI reports page.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, React Query, Express, PostgreSQL (Supabase), `@supabase/supabase-js`, `pg`

**Spec:** `docs/superpowers/specs/2026-03-18-mes-auth-dashboard-reporting-design.md`

---

## File Map

### Phase 1: Auth

| Action | Path |
|--------|------|
| Create | `server/database/migrations/027_profiles.sql` |
| Create | `server/database/migrations/028_audit_log.sql` |
| Create | `server/src/lib/supabase.ts` (singleton admin client — import everywhere on server) |
| Create | `client/src/lib/supabase.ts` (singleton anon client — import everywhere on client) |
| Create | `server/src/middleware/auth.ts` |
| Create | `server/src/middleware/roles.ts` |
| Create | `server/src/middleware/audit.ts` |
| Create | `server/src/controllers/profiles.controller.ts` |
| Create | `server/src/controllers/audit-log.controller.ts` |
| Create | `server/src/routes/profiles.routes.ts` |
| Create | `server/src/routes/audit-log.routes.ts` |
| Create | `client/src/contexts/AuthContext.tsx` |
| Create | `client/src/components/auth/ProtectedRoute.tsx` |
| Create | `client/src/components/auth/LoginPage.tsx` |
| Create | `client/src/pages/UserManagement.tsx` |
| Create | `client/src/pages/AuditLog.tsx` |
| Create | `client/src/hooks/useAuth.ts` |
| Create | `client/src/services/auth.service.ts` |
| Modify | `server/package.json` (add `@supabase/supabase-js`) |
| Modify | `client/package.json` (add `@supabase/supabase-js`) |
| Modify | `server/src/server.ts` (mount auth middleware + new routes) |
| Modify | `client/src/App.tsx` (add auth routes, wrap in AuthProvider) |
| Modify | `client/src/components/layout/AppLayout.tsx` (role-based sidebar, user display) |
| Modify | `client/src/services/api.ts` (attach JWT to requests) |
| Modify | `shared/types/index.ts` (auth types) |
| Modify | `server/.env` (add Supabase Auth env vars) |

### Phase 2: Production Dashboard

| Action | Path |
|--------|------|
| Create | `server/database/migrations/029_machine_status.sql` |
| Create | `server/database/migrations/030_user_id_links.sql` |
| Create | `server/src/controllers/production-dashboard.controller.ts` |
| Create | `server/src/routes/production-dashboard.routes.ts` |
| Create | `client/src/pages/ProductionDashboard.tsx` |
| Create | `client/src/components/dashboard/CommandCenterTab.tsx` |
| Create | `client/src/components/dashboard/MachineGridTab.tsx` |
| Create | `client/src/components/dashboard/KpiBar.tsx` |
| Create | `client/src/components/dashboard/MachineCard.tsx` |
| Create | `client/src/components/dashboard/JobQueuePanel.tsx` |
| Create | `client/src/components/dashboard/BottleneckAlerts.tsx` |
| Modify | `client/src/hooks/useDashboard.ts` (add `useProductionDashboard` hook) |
| Modify | `client/src/services/api.ts` or create `client/src/services/dashboard.service.ts` |
| Modify | `client/src/App.tsx` (add `/dashboard/production` route) |
| Modify | `client/src/components/layout/AppLayout.tsx` (add nav item) |
| Modify | `shared/types/index.ts` (dashboard response types) |
| Modify | `server/src/server.ts` (mount production dashboard route) |

### Phase 3: Reporting & Export

| Action | Path |
|--------|------|
| Create | `client/src/utils/exportCsv.ts` |
| Create | `server/src/controllers/reports.controller.ts` |
| Create | `server/src/routes/reports.routes.ts` |
| Create | `client/src/pages/Reports.tsx` |
| Create | `client/src/hooks/useReports.ts` |
| Create | `client/src/services/reports.service.ts` |
| Modify | `client/src/pages/Jobs.tsx` (add export button) |
| Modify | `client/src/pages/Clients.tsx` (add export button) |
| Modify | `client/src/pages/PartsTracking.tsx` (add export button) |
| Modify | `client/src/pages/AuditLog.tsx` (add export button) |
| Modify | `client/src/App.tsx` (add `/reports` route) |
| Modify | `client/src/components/layout/AppLayout.tsx` (add Reports nav item) |
| Modify | `server/src/server.ts` (mount reports route) |
| Modify | `shared/types/index.ts` (report types) |

---

## Phase 1: Authentication & Authorization

### Task 1: Install Supabase dependencies

**Files:**
- Modify: `server/package.json`
- Modify: `client/package.json`

- [ ] **Step 1: Install server dependency**

```bash
cd server && npm install @supabase/supabase-js
```

- [ ] **Step 2: Install client dependency**

```bash
cd client && npm install @supabase/supabase-js
```

- [ ] **Step 3: Create server-side Supabase singleton**

Create `server/src/lib/supabase.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Singleton admin client — use service role key for server-side operations
// Import this in middleware/auth.ts and controllers/profiles.controller.ts
// NEVER call createClient() again anywhere else on the server
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
```

- [ ] **Step 4: Add env vars to server/.env**

Add these lines to `server/.env` (get values from Supabase dashboard > Settings > API):

```
SUPABASE_URL=https://jmbezxqvsbzbslexgbhj.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
AUTH_REQUIRED=false
```

- [ ] **Step 4: Add env vars to client/.env**

Add to `client/.env`:

```
VITE_SUPABASE_URL=https://jmbezxqvsbzbslexgbhj.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

- [ ] **Step 5: Verify both packages build**

```bash
cd server && npm run build
cd ../client && npm run build
```

Expected: Both build without errors.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json client/package.json client/package-lock.json
git commit -m "chore: install @supabase/supabase-js for auth"
```

Note: Do NOT commit .env files.

---

### Task 2: Database migrations — profiles & audit_log

**Files:**
- Create: `server/database/migrations/027_profiles.sql`
- Create: `server/database/migrations/028_audit_log.sql`

- [ ] **Step 1: Create profiles migration**

Create `server/database/migrations/027_profiles.sql`:

```sql
-- Profiles table: extends Supabase auth.users with app-specific fields
-- Uses UUID PK referencing auth.users(id) — NOT serial integer
-- Use query() for inserts, not execute() (UUID PK incompatible with lastID)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'engineer', 'operator')),
  pin TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_pin ON profiles(pin) WHERE pin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Auto-create profile when a new auth user is created via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'operator'  -- always default to operator; admin endpoint updates role after creation
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: Create audit_log migration**

Create `server/database/migrations/028_audit_log.sql`:

```sql
-- Audit log: append-only table tracking all data changes
-- Never delete from this table

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
```

- [ ] **Step 3: Apply migrations via Supabase**

Apply both migrations using the Supabase MCP tool `apply_migration` or execute directly:

```bash
# Via Supabase MCP:
# apply_migration with name "027_profiles" and the SQL content
# apply_migration with name "028_audit_log" and the SQL content
```

- [ ] **Step 4: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('profiles', 'audit_log');
```

Expected: Both tables returned.

- [ ] **Step 5: Commit**

```bash
git add server/database/migrations/027_profiles.sql server/database/migrations/028_audit_log.sql
git commit -m "feat: add profiles and audit_log migrations"
```

---

### Task 3: Add auth types to shared types

**Files:**
- Modify: `shared/types/index.ts`

- [ ] **Step 1: Add auth types**

Append to `shared/types/index.ts`:

```typescript
// ============================================================
// AUTH & PROFILES
// ============================================================

export type UserRole = 'admin' | 'manager' | 'engineer' | 'operator';

export interface Profile {
  id: string;         // UUID from auth.users
  email: string;      // From auth.users, joined at query time
  name: string;
  role: UserRole;
  pin: string | null;  // Always masked in API responses
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  pin?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  role?: UserRole;
  pin?: string;
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  tableName?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add shared/types/index.ts
git commit -m "feat: add auth, profile, and audit log types"
```

---

### Task 4: Server auth middleware

**Files:**
- Create: `server/src/middleware/auth.ts`

This middleware extracts and validates the JWT from the Authorization header, then attaches the user to `req.user`. When `AUTH_REQUIRED=false`, it passes all requests through with a default dev user.

- [ ] **Step 1: Create auth middleware**

Create `server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { queryOne } from '../models/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'operator';
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const DEV_USER: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@capsule.local',
  name: 'Dev User',
  role: 'admin',
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // When auth is not required, attach a dev user and pass through
  if (process.env.AUTH_REQUIRED !== 'true') {
    req.user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch profile for role and name
    const profile = await queryOne<{ name: string; role: string; is_active: boolean }>(
      'SELECT name, role, is_active FROM profiles WHERE id = $1',
      [user.id]
    );

    if (!profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      name: profile.name,
      role: profile.role as AuthenticatedUser['role'],
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

- [ ] **Step 2: Verify server builds**

```bash
cd server && npm run build
```

Expected: Builds without errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat: add JWT auth middleware with AUTH_REQUIRED toggle"
```

---

### Task 5: Server role middleware

**Files:**
- Create: `server/src/middleware/roles.ts`

- [ ] **Step 1: Create role middleware**

Create `server/src/middleware/roles.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from './auth';

type UserRole = AuthenticatedUser['role'];

/**
 * Middleware that restricts access to specific roles.
 * Must be applied AFTER authMiddleware.
 *
 * Usage: router.get('/admin', requireRole('admin'), handler)
 * Usage: router.get('/manage', requireRole('admin', 'manager'), handler)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
};
```

- [ ] **Step 2: Verify server builds**

```bash
cd server && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/roles.ts
git commit -m "feat: add role-based access control middleware"
```

---

### Task 6: Audit logging middleware

**Files:**
- Create: `server/src/middleware/audit.ts`

- [ ] **Step 1: Create audit middleware**

Create `server/src/middleware/audit.ts`:

```typescript
import { query } from '../models/database';
import type { AuthenticatedUser } from './auth';

/**
 * Logs an action to the audit_log table. Fire-and-forget — errors are
 * logged to console but never propagated to the caller.
 */
export async function logAudit(params: {
  user: AuthenticatedUser | undefined;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string | number | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { user, action, tableName, recordId, oldValues, newValues } = params;
    await query(
      `INSERT INTO audit_log (user_id, user_name, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.id || null,
        user?.name || 'system',
        action,
        tableName,
        recordId ? String(recordId) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ]
    );
  } catch (error) {
    console.error('Audit log write failed (non-fatal):', error);
  }
}

/**
 * Helper: fetch a row's current state before an UPDATE or DELETE.
 * Returns the row as a plain object, or null if not found.
 */
export async function fetchCurrentState(
  tableName: string,
  idColumn: string,
  idValue: string | number
): Promise<Record<string, unknown> | null> {
  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM ${tableName} WHERE ${idColumn} = $1 LIMIT 1`,
      [idValue]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify server builds**

```bash
cd server && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/audit.ts
git commit -m "feat: add audit logging utility (fire-and-forget)"
```

---

### Task 7: Profiles controller & routes

**Files:**
- Create: `server/src/controllers/profiles.controller.ts`
- Create: `server/src/routes/profiles.routes.ts`

- [ ] **Step 1: Create profiles controller**

Create `server/src/controllers/profiles.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { query, queryOne } from '../models/database';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcrypt';

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
}

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email || '',
    name: row.name,
    role: row.role,
    pin: row.pin ? '••••' : null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/profiles — list all users (admin only)
export const getProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<ProfileRow>(
      `SELECT p.*, u.email
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       ORDER BY p.name`
    );
    res.json(rows.map(mapProfile));
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};

// GET /api/profiles/:id — get single profile (admin only)
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE p.id = $1`,
      [id]
    );
    if (!row) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(mapProfile(row));
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// POST /api/profiles — create new user (admin only)
// Creates auth.users entry via Supabase Admin API, profile auto-created by trigger
export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, pin } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Email, password, name, and role are required' });
      return;
    }

    const validRoles = ['admin', 'manager', 'engineer', 'operator'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Create auth user (trigger auto-creates profile row)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for internal tool
      user_metadata: { name, role },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const userId = data.user.id;

    // Update profile with correct name and role (trigger sets defaults from metadata)
    await query(
      `UPDATE profiles SET name = $1, role = $2, updated_at = NOW() WHERE id = $3`,
      [name, role, userId]
    );

    // Set PIN if provided
    if (pin) {
      const hashedPin = await bcrypt.hash(pin, 10);
      await query('UPDATE profiles SET pin = $1 WHERE id = $2', [hashedPin, userId]);
    }

    // Fetch and return the created profile
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [userId]
    );

    await logAudit({
      user: req.user,
      action: 'CREATE',
      tableName: 'profiles',
      recordId: userId,
      newValues: { email, name, role },
    });

    res.status(201).json(mapProfile(row!));
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /api/profiles/:id — update profile (admin only)
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, pin, isActive } = req.body;

    const existing = await queryOne<ProfileRow>('SELECT * FROM profiles WHERE id = $1', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const updates: string[] = [];
    const params: (string | boolean)[] = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'engineer', 'operator'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        return;
      }
      updates.push(`role = $${paramIdx++}`);
      params.push(role);
    }
    if (pin !== undefined) {
      const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;
      updates.push(`pin = $${paramIdx++}`);
      params.push(hashedPin as string);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      params
    );

    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [id]
    );

    await logAudit({
      user: req.user,
      action: 'UPDATE',
      tableName: 'profiles',
      recordId: id,
      oldValues: { name: existing.name, role: existing.role, is_active: existing.is_active },
      newValues: { name: row!.name, role: row!.role, is_active: row!.is_active },
    });

    res.json(mapProfile(row!));
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/profiles/me — get current user's profile
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [req.user.id]
    );
    if (!row) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(mapProfile(row));
  } catch (error) {
    console.error('Error fetching my profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
```

- [ ] **Step 2: Create profiles routes**

Create `server/src/routes/profiles.routes.ts`:

```typescript
import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  getMyProfile,
} from '../controllers/profiles.controller';

const router = Router();

// Current user's own profile — no role restriction
router.get('/me', getMyProfile);

// Admin-only user management
router.get('/', requireRole('admin'), getProfiles);
router.get('/:id', requireRole('admin'), getProfile);
router.post('/', requireRole('admin'), createProfile);
router.put('/:id', requireRole('admin'), updateProfile);

export default router;
```

- [ ] **Step 3: Verify server builds**

```bash
cd server && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/profiles.controller.ts server/src/routes/profiles.routes.ts
git commit -m "feat: add profiles controller and routes (admin user management)"
```

---

### Task 8: Audit log controller & routes

**Files:**
- Create: `server/src/controllers/audit-log.controller.ts`
- Create: `server/src/routes/audit-log.routes.ts`

- [ ] **Step 1: Create audit log controller**

Create `server/src/controllers/audit-log.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

interface AuditRow {
  id: number;
  user_id: string | null;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

function mapAuditEntry(row: AuditRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    createdAt: row.created_at,
  };
}

// GET /api/audit-log
export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      action,
      tableName,
      from,
      to,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (action) {
      conditions.push(`action = $${paramIdx++}`);
      params.push(action);
    }
    if (tableName) {
      conditions.push(`table_name = $${paramIdx++}`);
      params.push(tableName);
    }
    if (from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(to + 'T23:59:59Z');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${where}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const rows = await query<AuditRow>(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limitNum, offset]
    );

    res.json({
      data: rows.map(mapAuditEntry),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};
```

- [ ] **Step 2: Create audit log routes**

Create `server/src/routes/audit-log.routes.ts`:

```typescript
import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import { getAuditLog } from '../controllers/audit-log.controller';

const router = Router();

router.get('/', requireRole('admin', 'manager'), getAuditLog);

export default router;
```

- [ ] **Step 3: Verify server builds**

```bash
cd server && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/audit-log.controller.ts server/src/routes/audit-log.routes.ts
git commit -m "feat: add audit log endpoint with pagination and filters"
```

---

### Task 9: Mount auth middleware and new routes in server.ts

**Files:**
- Modify: `server/src/server.ts`

- [ ] **Step 1: Add imports and mount middleware**

In `server/src/server.ts`, add the following imports near the top with the other route imports:

```typescript
import { authMiddleware } from './middleware/auth';
import profilesRouter from './routes/profiles.routes';
import auditLogRouter from './routes/audit-log.routes';
```

Add the auth middleware AFTER the existing middleware (helmet, cors, json, urlencoded, request logger) but BEFORE the route registrations:

```typescript
// Auth middleware — applied globally, behavior controlled by AUTH_REQUIRED env var
app.use(authMiddleware);
```

Add the new route registrations alongside the existing ones:

```typescript
app.use('/api/profiles', profilesRouter);
app.use('/api/audit-log', auditLogRouter);
```

**Important:** The kiosk auth endpoint (`POST /api/station-kiosks/auth`) needs to be exempt from auth. Since `AUTH_REQUIRED` defaults to `false`, this is not an immediate issue. When `AUTH_REQUIRED` is set to `true`, the kiosk auth route should be mounted BEFORE the auth middleware, or the auth middleware should explicitly skip `/api/station-kiosks/auth`. Add this check to the auth middleware:

In `server/src/middleware/auth.ts`, add at the top of `authMiddleware`:

```typescript
// Public endpoints that don't require auth
const publicPaths = ['/api/station-kiosks/auth', '/health'];
if (publicPaths.some(p => req.path === p)) {
  return next();
}
```

- [ ] **Step 2: Verify server starts**

```bash
cd server && npm run dev
```

Expected: Server starts on port 3001 without errors. Existing endpoints still work (since AUTH_REQUIRED=false).

- [ ] **Step 3: Test that existing endpoints still work**

```bash
curl http://localhost:3001/api/jobs | head -c 200
```

Expected: Returns JSON array of jobs (auth passes through with dev user).

- [ ] **Step 4: Commit**

```bash
git add server/src/server.ts server/src/middleware/auth.ts
git commit -m "feat: mount auth middleware and profile/audit routes in server"
```

---

### Task 10: Client auth service & Supabase client

**Files:**
- Create: `client/src/lib/supabase.ts` (singleton client — import this everywhere, never call `createClient` elsewhere on the frontend)
- Create: `client/src/services/auth.service.ts`

**Important:** Create ONE shared Supabase client instance in `client/src/lib/supabase.ts` and import it everywhere on the frontend. Having two separate `createClient()` calls on the client creates independent session state that causes token refresh bugs.

- [ ] **Step 1: Create the shared Supabase client singleton**

Create `client/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set — auth will be disabled');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

- [ ] **Step 2: Create auth service**

Create `client/src/services/auth.service.ts` (import `supabase` from `../lib/supabase`, never call `createClient` here):

```typescript
import { supabase } from '../lib/supabase';
import api from './api';
import type { Profile, CreateUserRequest, UpdateProfileRequest } from '../types';

// Auth operations (via Supabase client singleton)
export async function login(email: string, password: string) {
  if (!supabase) throw new Error('Auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Profile operations (via Express API)
export async function getMyProfile(): Promise<Profile> {
  const { data } = await api.get('/profiles/me');
  return data;
}

export async function getProfiles(): Promise<Profile[]> {
  const { data } = await api.get('/profiles');
  return data;
}

export async function getProfileById(id: string): Promise<Profile> {
  const { data } = await api.get(`/profiles/${id}`);
  return data;
}

export async function createUser(req: CreateUserRequest): Promise<Profile> {
  const { data } = await api.post('/profiles', req);
  return data;
}

export async function updateProfile(id: string, req: UpdateProfileRequest): Promise<Profile> {
  const { data } = await api.put(`/profiles/${id}`, req);
  return data;
}
```

- [ ] **Step 3: Update api.ts to attach JWT**

In `client/src/services/api.ts`, import the shared singleton (do NOT call `createClient` here):

```typescript
import { supabase } from '../lib/supabase';
```

Update the existing request interceptor to add the auth token:

```typescript
api.interceptors.request.use(async (config) => {
  console.log(`${config.method?.toUpperCase()} ${config.url}`);

  // Attach Supabase JWT if available
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return config;
});
```

- [ ] **Step 3: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/auth.service.ts client/src/services/api.ts
git commit -m "feat: add auth service and JWT attachment to API requests"
```

---

### Task 11: AuthContext and useAuth hook

**Files:**
- Create: `client/src/contexts/AuthContext.tsx`
- Create: `client/src/hooks/useAuth.ts`

- [ ] **Step 1: Create AuthContext**

Create `client/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfile } from '../services/auth.service';
import type { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getMyProfile();
          setUser({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const profile = await getMyProfile();
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
            });
          } catch {
            setUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle setting user
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Create useAuth hook**

Create `client/src/hooks/useAuth.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/auth.service';
import type { Profile, CreateUserRequest, UpdateProfileRequest } from '../types';

const profileKeys = {
  all: ['profiles'] as const,
  list: () => [...profileKeys.all, 'list'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  me: () => [...profileKeys.all, 'me'] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: authService.getProfiles,
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => authService.getProfileById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => authService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.list() });
    },
  });
}

export function useUpdateProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authService.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.list() });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
    },
  });
}
```

- [ ] **Step 3: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add client/src/contexts/AuthContext.tsx client/src/hooks/useAuth.ts
git commit -m "feat: add AuthContext provider and useAuth hooks"
```

---

### Task 12: Login page and ProtectedRoute component

**Files:**
- Create: `client/src/components/auth/LoginPage.tsx`
- Create: `client/src/components/auth/ProtectedRoute.tsx`

- [ ] **Step 1: Create LoginPage**

Create `client/src/components/auth/LoginPage.tsx`:

```typescript
import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-100 rounded-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">CAPSULE</h1>
            <p className="text-sm text-gray-500 mt-1">Manufacturing ERP</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProtectedRoute**

Create `client/src/components/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/auth/LoginPage.tsx client/src/components/auth/ProtectedRoute.tsx
git commit -m "feat: add login page and protected route components"
```

---

### Task 13: Update App.tsx with auth routing

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Wrap app in AuthProvider and add login route**

Update `client/src/App.tsx`:

1. Add imports at the top:
```typescript
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserManagement from './pages/UserManagement';
import AuditLogPage from './pages/AuditLog';
```

2. Wrap the `<BrowserRouter>` content in `<AuthProvider>`:
```typescript
<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        {/* ... routes ... */}
      </BrowserRouter>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

3. Add `/login` route BEFORE the layout routes:
```typescript
<Route path="/login" element={<LoginPage />} />
```

4. Wrap the main layout `<Route>` in a ProtectedRoute:
```typescript
<Route path="/" element={
  <ProtectedRoute>
    <AppLayout />
  </ProtectedRoute>
}>
  {/* existing child routes */}
  <Route path="admin/users" element={
    <ProtectedRoute roles={['admin']}>
      <UserManagement />
    </ProtectedRoute>
  } />
  <Route path="admin/audit-log" element={
    <ProtectedRoute roles={['admin', 'manager']}>
      <AuditLogPage />
    </ProtectedRoute>
  } />
</Route>
```

**Note:** UserManagement and AuditLog pages will be created in Tasks 15 and 16. Create placeholder files for now to avoid build errors:

Create placeholder `client/src/pages/UserManagement.tsx`:
```typescript
export default function UserManagement() {
  return <div className="p-6"><h1 className="text-lg font-semibold text-gray-900">User Management</h1><p className="text-sm text-gray-500 mt-1">Coming soon</p></div>;
}
```

Create placeholder `client/src/pages/AuditLog.tsx`:
```typescript
export default function AuditLogPage() {
  return <div className="p-6"><h1 className="text-lg font-semibold text-gray-900">Audit Log</h1><p className="text-sm text-gray-500 mt-1">Coming soon</p></div>;
}
```

- [ ] **Step 2: Verify client builds and login page renders**

```bash
cd client && npm run build
```

Start dev server and navigate to `/login` — should see the login form.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx client/src/pages/UserManagement.tsx client/src/pages/AuditLog.tsx
git commit -m "feat: integrate auth routing with login, protected routes, and admin pages"
```

---

### Task 14: Update AppLayout with role-based sidebar

**Files:**
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Add auth imports and user display**

In `client/src/components/layout/AppLayout.tsx`:

1. Add import:
```typescript
import { useAuthContext } from '../../contexts/AuthContext';
import { SignOut, UserCircle, Shield, ClipboardText } from '@phosphor-icons/react';
```

2. Inside the component, get the auth context:
```typescript
const { user, logout } = useAuthContext();
```

3. Filter nav items based on role. Define the nav items with role restrictions:

```typescript
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[]; // undefined = all roles can see
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <SquaresFour ... /> },
  { label: 'Jobs', path: '/jobs', icon: <Briefcase ... /> },
  { label: 'Engineering', path: '/engineering', icon: <Wrench ... />, roles: ['admin', 'manager', 'engineer'] },
  { label: 'Supply Chain', path: '/supply-chain', icon: <Package ... />, roles: ['admin', 'manager', 'engineer'] },
  { label: 'Production', path: '/production', icon: <Factory ... />, roles: ['admin', 'manager'] },
  { label: 'Station Kiosks', path: '/station-kiosks', icon: <Monitor ... />, roles: ['admin', 'manager'] },
  { label: 'Clients', path: '/clients', icon: <Users ... />, roles: ['admin', 'manager'] },
];

const adminNavItems: NavItem[] = [
  { label: 'Users', path: '/admin/users', icon: <Shield size={20} weight="regular" />, roles: ['admin'] },
  { label: 'Audit Log', path: '/admin/audit-log', icon: <ClipboardText size={20} weight="regular" />, roles: ['admin', 'manager'] },
];
```

4. Filter items by current user role:
```typescript
const visibleNav = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));
const visibleAdmin = adminNavItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));
```

5. Render `visibleNav` instead of hardcoded nav items. Add an "Admin" section divider before `visibleAdmin` items if any are visible.

6. Replace the footer with user info + logout:
```typescript
<div className="p-4 border-t border-gray-100">
  <div className="flex items-center gap-3 mb-3">
    <UserCircle size={32} weight="regular" className="text-gray-400" />
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
    </div>
  </div>
  <button
    onClick={logout}
    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 w-full"
  >
    <SignOut size={16} weight="regular" />
    Sign out
  </button>
</div>
```

- [ ] **Step 2: Verify client builds and sidebar renders correctly**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/AppLayout.tsx
git commit -m "feat: add role-based sidebar navigation and user display"
```

---

### Task 15: User Management page

**Files:**
- Modify: `client/src/pages/UserManagement.tsx` (replace placeholder)

- [ ] **Step 1: Implement the full User Management page**

Replace the placeholder in `client/src/pages/UserManagement.tsx` with a full implementation that includes:

- Table listing all users (name, email, role, active status)
- "Add User" button opening a modal with: email, password, name, role dropdown, optional PIN
- Edit button per row opening a modal with: name, role dropdown, PIN reset, active toggle
- No delete — only deactivate via is_active toggle
- Uses `useProfiles()`, `useCreateUser()`, `useUpdateProfile()` hooks
- Toast notifications on success/error
- Follows existing modal patterns (see `client/src/components/clients/AddClientModal.tsx` for reference)

**Key UI elements:**
- Page header: "User Management" with "Add User" button
- Table columns: Name, Email, Role (capitalized), Status (active/inactive dot), Actions (Edit)
- Add User modal: email input, password input, name input, role Select (Admin/Manager/Engineer/Operator), PIN input (optional, for operators)
- Edit User modal: name input, role Select, PIN input (shows "Set new PIN"), Active toggle

- [ ] **Step 2: Verify it builds and renders**

```bash
cd client && npm run build
```

Navigate to `/admin/users` — should see the user management page.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/UserManagement.tsx
git commit -m "feat: implement user management page (admin only)"
```

---

### Task 16: Audit Log page

**Files:**
- Modify: `client/src/pages/AuditLog.tsx` (replace placeholder)

- [ ] **Step 1: Implement the full Audit Log page**

Replace the placeholder in `client/src/pages/AuditLog.tsx` with a full implementation:

- Fetches from `GET /api/audit-log` with filters
- Filter bar: user dropdown, action dropdown (CREATE/UPDATE/DELETE), table dropdown, date range (from/to)
- Table: timestamp (formatted), user name, action, table, record ID
- Expandable rows showing old/new values as formatted JSON
- Pagination controls (prev/next page, showing "Page X of Y, N total entries")
- Uses React Query for data fetching

**Create a service function** in `client/src/services/auth.service.ts`:

```typescript
export async function getAuditLog(filters: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.tableName) params.set('tableName', filters.tableName);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const { data } = await api.get(`/audit-log?${params.toString()}`);
  return data;
}
```

**Create a hook** in `client/src/hooks/useAuth.ts`:

```typescript
export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => authService.getAuditLog(filters),
  });
}
```

- [ ] **Step 2: Verify it builds**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AuditLog.tsx client/src/services/auth.service.ts client/src/hooks/useAuth.ts
git commit -m "feat: implement audit log viewer with filters and pagination"
```

---

### Task 17: Update kiosk controller to use profiles for PIN auth

**Files:**
- Modify: `server/src/controllers/station-kiosks.controller.ts`
- Modify: `client/src/contexts/KioskContext.tsx`

The existing kiosk auth looks up PINs from `station_kiosks.pin_code`. Per the spec, PINs move to `profiles.pin`. The `station_kiosks` table stays for station-to-machine mapping.

- [ ] **Step 1: Update `authenticateStation` in station-kiosks.controller.ts**

Find the `authenticateStation` function. Replace its PIN lookup logic so it queries `profiles` instead of `station_kiosks`:

```typescript
export const authenticateStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pinCode } = req.body;
    if (!pinCode) {
      res.status(400).json({ error: 'PIN code is required' });
      return;
    }

    // Look up PIN against profiles table (not station_kiosks)
    const profilesWithPin = await query<{ id: string; name: string; pin: string }>(
      `SELECT id, name, pin FROM profiles WHERE pin IS NOT NULL AND is_active = true`
    );

    let matchedProfile: { id: string; name: string } | null = null;
    for (const profile of profilesWithPin) {
      const match = await bcrypt.compare(pinCode, profile.pin);
      if (match) {
        matchedProfile = { id: profile.id, name: profile.name };
        break;
      }
    }

    if (!matchedProfile) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    // Return user identity — kiosk UI handles station selection separately via station_kiosks
    res.json({
      userId: matchedProfile.id,
      userName: matchedProfile.name,
      // Legacy fields retained for backward compatibility with existing kiosk UI:
      kioskId: 0,
      stationName: matchedProfile.name,
    });
  } catch (error) {
    console.error('Kiosk auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
```

- [ ] **Step 2: Update KioskContext to store userId**

In `client/src/contexts/KioskContext.tsx`, add `userId` and `userName` to `KioskState`:

```typescript
interface KioskState {
  stationName: string;
  kioskId: number;
  machineId?: number;
  machineName?: string;
  userId?: string;    // Profile UUID from auth
  userName?: string;  // Operator display name
}
```

Update the `login` function to accept and store `userId`/`userName` from the auth response.

- [ ] **Step 3: Verify server builds**

```bash
cd server && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/station-kiosks.controller.ts client/src/contexts/KioskContext.tsx
git commit -m "feat: update kiosk auth to look up PINs from profiles table"
```

---

### Task 18: End-to-end auth verification

- [ ] **Step 1: Create a test admin user via Supabase**

Using the Supabase dashboard or MCP, create a test user:
- Email: `admin@capsule.local`
- Password: `capsule-admin-2026`

Then manually insert a profile:
```sql
-- After the auth user is auto-created by the trigger, update role to admin:
UPDATE profiles SET role = 'admin', name = 'Admin User'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@capsule.local');
```

- [ ] **Step 2: Set AUTH_REQUIRED=true temporarily and test**

Set `AUTH_REQUIRED=true` in `server/.env`, restart server.

1. Visit `/login` — should see login form
2. Enter credentials — should redirect to dashboard
3. Sidebar should show all nav items (admin role)
4. Visit `/admin/users` — should work
5. Create a new user with role "operator"
6. Log out — should redirect to `/login`
7. Log in as operator — sidebar should show fewer items
8. Visit `/admin/users` directly — should show "Access Denied"

- [ ] **Step 3: Set AUTH_REQUIRED back to false for continued development**

```bash
# In server/.env, set AUTH_REQUIRED=false
```

- [ ] **Step 4: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: address auth integration test findings"
```

---

## Phase 2: Production Dashboard

### Task 18: Machine status and user link migrations

**Files:**
- Create: `server/database/migrations/029_machine_status.sql`
- Create: `server/database/migrations/030_user_id_links.sql`

- [ ] **Step 1: Create machine status migration**

Create `server/database/migrations/029_machine_status.sql`:

```sql
-- Add machine down status fields
-- is_down takes priority over derived status in dashboard queries

ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_down BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS down_reason TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS down_since TIMESTAMPTZ;
```

- [ ] **Step 2: Create user link migration**

Create `server/database/migrations/030_user_id_links.sql`:

```sql
-- Link part station logs and job labor to user profiles
-- operator_name is kept for backward compatibility with historical data
-- New entries should populate both operator_name and user_id

ALTER TABLE part_station_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE job_labor ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
```

- [ ] **Step 3: Apply migrations via Supabase**

Apply both migrations.

- [ ] **Step 4: Verify columns exist**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'machines' AND column_name IN ('is_down', 'down_reason', 'down_since');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'part_station_logs' AND column_name = 'user_id';
```

- [ ] **Step 5: Commit**

```bash
git add server/database/migrations/029_machine_status.sql server/database/migrations/030_user_id_links.sql
git commit -m "feat: add machine status fields and user_id links"
```

---

### Task 19: Production dashboard types

**Files:**
- Modify: `shared/types/index.ts`

- [ ] **Step 1: Add production dashboard types**

Append to `shared/types/index.ts`:

```typescript
// ============================================================
// PRODUCTION DASHBOARD
// ============================================================

export type MachineStatus = 'running' | 'idle' | 'down';

export interface ProductionDashboardData {
  kpis: {
    activeJobs: number;
    partsCompletedToday: number;
    onTimeRate: number;
    blockedJobs: number;
  };
  machines: DashboardMachine[];
  jobQueue: DashboardJob[];
  bottlenecks: Bottleneck[];
}

export interface DashboardMachine {
  id: number;
  name: string;
  type: string;
  status: MachineStatus;
  currentJob: { id: number; jobNumber: string; description: string } | null;
  currentOperator: string | null;
  currentPart: { description: string; completed: number; total: number } | null;
  nextJob: { id: number; jobNumber: string } | null;
  downReason: string | null;
  downSince: string | null;
}

export interface DashboardJob {
  id: number;
  jobNumber: string;
  clientName: string;
  description: string;
  priority: string;
  currentStage: string;
  stageStatus: string;
  targetEndDate: string | null;
}

export interface Bottleneck {
  type: 'machine_down' | 'job_blocked' | 'job_overdue';
  message: string;
  severity: 'critical' | 'warning';
  relatedId: number;
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add shared/types/index.ts
git commit -m "feat: add production dashboard types"
```

---

### Task 20: Production dashboard backend

**Files:**
- Create: `server/src/controllers/production-dashboard.controller.ts`
- Create: `server/src/routes/production-dashboard.routes.ts`
- Modify: `server/src/server.ts`

- [ ] **Step 1: Create production dashboard controller**

Create `server/src/controllers/production-dashboard.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

export const getProductionDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // KPIs
    const activeJobsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Active'`
    );

    const partsCompletedTodayResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM tracked_parts
       WHERE status = 'Completed' AND updated_at::date = CURRENT_DATE`
    );

    const completedJobs = await query<{ on_time: boolean }>(
      `SELECT (completed_date <= target_end_date) as on_time
       FROM jobs WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL`
    );
    const onTimeRate = completedJobs.length > 0
      ? Math.round((completedJobs.filter(j => j.on_time).length / completedJobs.length) * 100)
      : 100;

    const blockedJobsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT job_id)::text as count FROM job_workflow_progress WHERE status = 'Blocked'`
    );

    // Machines with status derivation
    const machines = await query<{
      id: number; name: string; type: string; active: number;
      is_down: boolean; down_reason: string | null; down_since: string | null;
    }>('SELECT * FROM machines WHERE active = 1 ORDER BY display_order, name');

    const machineData = await Promise.all(machines.map(async (m) => {
      // Check if machine is down (manual flag takes priority)
      if (m.is_down) {
        // Still check for next queued job
        const nextJob = await queryOne<{ id: number; job_number: string }>(
          `SELECT j.id, j.job_number FROM work_orders wo
           JOIN jobs j ON j.id = wo.job_id
           WHERE wo.assigned_machine_id = $1 AND wo.production_status IN ('In Pool', 'Assigned')
           ORDER BY j.priority, j.created_at LIMIT 1`,
          [m.id]
        );
        return {
          id: m.id, name: m.name, type: m.type || '',
          status: 'down' as const,
          currentJob: null, currentOperator: null, currentPart: null,
          nextJob: nextJob ? { id: nextJob.id, jobNumber: nextJob.job_number } : null,
          downReason: m.down_reason, downSince: m.down_since,
        };
      }

      // Check for in-progress work order on this machine
      const activeWo = await queryOne<{
        id: number; job_id: number; job_number: string; description: string;
      }>(
        `SELECT wo.id, wo.job_id, j.job_number, j.description
         FROM work_orders wo
         JOIN jobs j ON j.id = wo.job_id
         WHERE wo.assigned_machine_id = $1 AND wo.production_status = 'In Progress'
         LIMIT 1`,
        [m.id]
      );

      if (activeWo) {
        // Get part progress for this work order
        const partStats = await queryOne<{ completed: string; total: string }>(
          `SELECT
            COUNT(CASE WHEN status = 'Completed' THEN 1 END)::text as completed,
            COUNT(*)::text as total
           FROM tracked_parts WHERE work_order_id = $1`,
          [activeWo.id]
        );

        // Get current operator (most recent check-in without check-out)
        const currentOp = await queryOne<{ operator_name: string }>(
          `SELECT psl.operator_name FROM part_station_logs psl
           JOIN tracked_parts tp ON tp.id = psl.tracked_part_id
           WHERE tp.work_order_id = $1 AND psl.checked_out_at IS NULL
           ORDER BY psl.checked_in_at DESC LIMIT 1`,
          [activeWo.id]
        );

        return {
          id: m.id, name: m.name, type: m.type || '',
          status: 'running' as const,
          currentJob: {
            id: activeWo.job_id,
            jobNumber: activeWo.job_number,
            description: activeWo.description || '',
          },
          currentOperator: currentOp?.operator_name || null,
          currentPart: partStats ? {
            description: activeWo.description || '',
            completed: parseInt(partStats.completed),
            total: parseInt(partStats.total),
          } : null,
          nextJob: null,
          downReason: null, downSince: null,
        };
      }

      // Idle — find next queued job
      const nextJob = await queryOne<{ id: number; job_number: string }>(
        `SELECT j.id, j.job_number FROM work_orders wo
         JOIN jobs j ON j.id = wo.job_id
         WHERE wo.assigned_machine_id = $1 AND wo.production_status IN ('In Pool', 'Assigned')
         ORDER BY j.priority, j.created_at LIMIT 1`,
        [m.id]
      );

      return {
        id: m.id, name: m.name, type: m.type || '',
        status: 'idle' as const,
        currentJob: null, currentOperator: null, currentPart: null,
        nextJob: nextJob ? { id: nextJob.id, jobNumber: nextJob.job_number } : null,
        downReason: null, downSince: null,
      };
    }));

    // Job queue
    const jobQueue = await query<{
      id: number; job_number: string; client_name: string;
      description: string; priority: string; target_end_date: string | null;
      stage_name: string; stage_status: string;
    }>(
      `SELECT j.id, j.job_number, c.name as client_name, j.description, j.priority,
              j.target_end_date, jwp.stage_name, jwp.status as stage_status
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN LATERAL (
         SELECT ws.name as stage_name, jwp.status
         FROM job_workflow_progress jwp
         JOIN workflow_stages ws ON ws.id = jwp.stage_id
         WHERE jwp.job_id = j.id AND jwp.status IN ('In Progress', 'Not Started')
         ORDER BY ws.display_order
         LIMIT 1
       ) jwp ON true
       WHERE j.status = 'Active'
       ORDER BY CASE j.priority
         WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
         WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END,
       j.created_at`
    );

    // Bottlenecks
    const bottlenecks: Array<{
      type: string; message: string; severity: string; relatedId: number;
    }> = [];

    // Down machines
    const downMachines = machineData.filter(m => m.status === 'down');
    for (const dm of downMachines) {
      bottlenecks.push({
        type: 'machine_down',
        message: `${dm.name} is down${dm.downReason ? ': ' + dm.downReason : ''}`,
        severity: 'critical',
        relatedId: dm.id,
      });
    }

    // Blocked jobs
    const blockedJobs = await query<{ job_id: number; job_number: string; stage_name: string }>(
      `SELECT j.id as job_id, j.job_number, ws.name as stage_name
       FROM job_workflow_progress jwp
       JOIN jobs j ON j.id = jwp.job_id
       JOIN workflow_stages ws ON ws.id = jwp.stage_id
       WHERE jwp.status = 'Blocked' AND j.status = 'Active'`
    );
    for (const bj of blockedJobs) {
      bottlenecks.push({
        type: 'job_blocked',
        message: `${bj.job_number} blocked at ${bj.stage_name}`,
        severity: 'critical',
        relatedId: bj.job_id,
      });
    }

    // Overdue jobs
    const overdueJobs = await query<{ id: number; job_number: string; target_end_date: string }>(
      `SELECT id, job_number, target_end_date FROM jobs
       WHERE status = 'Active' AND target_end_date < CURRENT_DATE`
    );
    for (const oj of overdueJobs) {
      bottlenecks.push({
        type: 'job_overdue',
        message: `${oj.job_number} past due (target: ${oj.target_end_date})`,
        severity: 'warning',
        relatedId: oj.id,
      });
    }

    res.json({
      kpis: {
        activeJobs: parseInt(activeJobsResult?.count || '0'),
        partsCompletedToday: parseInt(partsCompletedTodayResult?.count || '0'),
        onTimeRate,
        blockedJobs: parseInt(blockedJobsResult?.count || '0'),
      },
      machines: machineData,
      jobQueue: jobQueue.map(j => ({
        id: j.id,
        jobNumber: j.job_number,
        clientName: j.client_name || '',
        description: j.description || '',
        priority: j.priority,
        currentStage: j.stage_name || 'Completed',
        stageStatus: j.stage_status || 'Completed',
        targetEndDate: j.target_end_date,
      })),
      bottlenecks,
    });
  } catch (error) {
    console.error('Error fetching production dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch production dashboard data' });
  }
};

// PUT /api/dashboard/production/machines/:id/status — toggle machine down status
export const updateMachineStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isDown, downReason } = req.body;

    await query(
      `UPDATE machines SET is_down = $1, down_reason = $2,
       down_since = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
       updated_at = NOW()
       WHERE id = $3`,
      [isDown, isDown ? downReason || null : null, id]
    );

    res.json({ message: 'Machine status updated' });
  } catch (error) {
    console.error('Error updating machine status:', error);
    res.status(500).json({ error: 'Failed to update machine status' });
  }
};
```

- [ ] **Step 2: Create production dashboard routes**

Create `server/src/routes/production-dashboard.routes.ts`:

```typescript
import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getProductionDashboard,
  updateMachineStatus,
} from '../controllers/production-dashboard.controller';

const router = Router();

router.get('/', getProductionDashboard);
router.put('/machines/:id/status', requireRole('admin', 'manager'), updateMachineStatus);

export default router;
```

- [ ] **Step 3: Mount route in server.ts**

In `server/src/server.ts`, add:

```typescript
import productionDashboardRouter from './routes/production-dashboard.routes';
```

And mount:

```typescript
app.use('/api/dashboard/production', productionDashboardRouter);
```

- [ ] **Step 4: Verify server builds and endpoint returns data**

```bash
cd server && npm run build
```

Start server and test:
```bash
curl http://localhost:3001/api/dashboard/production | python -m json.tool
```

Expected: JSON with `kpis`, `machines`, `jobQueue`, `bottlenecks` fields.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/production-dashboard.controller.ts server/src/routes/production-dashboard.routes.ts server/src/server.ts
git commit -m "feat: add production dashboard API endpoint"
```

---

### Task 21: Production dashboard frontend — hooks and service

**Files:**
- Modify: `client/src/hooks/useDashboard.ts`
- Modify or create: `client/src/services/dashboard.service.ts`

- [ ] **Step 1: Create dashboard service**

Create `client/src/services/dashboard.service.ts`:

```typescript
import api from './api';
import type { ProductionDashboardData } from '../types';

export async function getProductionDashboard(): Promise<ProductionDashboardData> {
  const { data } = await api.get('/dashboard/production');
  return data;
}

export async function updateMachineStatus(
  machineId: number,
  isDown: boolean,
  downReason?: string
): Promise<void> {
  await api.put(`/dashboard/production/machines/${machineId}/status`, { isDown, downReason });
}
```

- [ ] **Step 2: Add hook to useDashboard.ts**

In `client/src/hooks/useDashboard.ts`, add:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as dashboardService from '../services/dashboard.service';

const dashboardKeys = {
  production: ['dashboard', 'production'] as const,
};

export function useProductionDashboard(refetchInterval = 30000) {
  return useQuery({
    queryKey: dashboardKeys.production,
    queryFn: dashboardService.getProductionDashboard,
    refetchInterval,
  });
}

export function useUpdateMachineStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ machineId, isDown, downReason }: { machineId: number; isDown: boolean; downReason?: string }) =>
      dashboardService.updateMachineStatus(machineId, isDown, downReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.production });
    },
  });
}
```

- [ ] **Step 3: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/dashboard.service.ts client/src/hooks/useDashboard.ts
git commit -m "feat: add production dashboard hook and service"
```

---

### Task 22: Production Dashboard page with Command Center and Machine Grid

**Files:**
- Create: `client/src/pages/ProductionDashboard.tsx`
- Create: `client/src/components/dashboard/KpiBar.tsx`
- Create: `client/src/components/dashboard/CommandCenterTab.tsx`
- Create: `client/src/components/dashboard/MachineGridTab.tsx`
- Create: `client/src/components/dashboard/MachineCard.tsx`
- Create: `client/src/components/dashboard/JobQueuePanel.tsx`
- Create: `client/src/components/dashboard/BottleneckAlerts.tsx`

This is the largest task. Build each component individually.

- [ ] **Step 1: Create KpiBar component**

Create `client/src/components/dashboard/KpiBar.tsx`:

A row of 4 KPI cards: Active Jobs, Parts Completed Today, On-Time Rate (%), Blocked Jobs.
- Each card: `bg-white border border-gray-100 rounded-lg p-4`
- Label: `text-xs font-medium text-gray-500 uppercase tracking-wider`
- Value: `text-2xl font-semibold text-gray-900`
- Grid: `grid grid-cols-4 gap-4`
- On-Time Rate shows percentage, Blocked Jobs shows count with red text if > 0

- [ ] **Step 2: Create MachineCard component**

Create `client/src/components/dashboard/MachineCard.tsx`:

Individual machine card for the Machine Grid tab.
- Props: `DashboardMachine` from types
- Card: `bg-white border border-gray-100 rounded-lg p-4`
- Status dot: 12px circle (green=running, amber=idle, red=down)
- Machine name: `text-sm font-semibold text-gray-900`
- Current job: `text-sm text-gray-600` or "No job assigned" in `text-gray-400`
- Progress bar: gray-100 track, blue-500 fill, `text-xs text-gray-500` "X/Y parts"
- Down: red dot, `text-sm text-red-500` reason text
- Down machines card uses standard `border-gray-100` (no colored borders per design system)

- [ ] **Step 3: Create JobQueuePanel component**

Create `client/src/components/dashboard/JobQueuePanel.tsx`:

Job queue list for Command Center.
- Props: `DashboardJob[]`
- Header: "Job Queue" with count
- Each row: job number (font-medium), client name, current stage, status dot, priority badge
- Sorted by priority (Critical first)
- Overdue jobs show amber indicator

- [ ] **Step 4: Create BottleneckAlerts component**

Create `client/src/components/dashboard/BottleneckAlerts.tsx`:

Alert cards for bottlenecks.
- Props: `Bottleneck[]`
- Each alert: small card with icon, message, severity coloring
- Critical (machine_down, job_blocked): red-50 bg, red-500 text icon
- Warning (job_overdue): amber-50 bg, amber-500 text icon
- Empty state: "No bottlenecks detected" in green-50

- [ ] **Step 5: Create CommandCenterTab component**

Create `client/src/components/dashboard/CommandCenterTab.tsx`:

Composes KpiBar + Machine status list + JobQueuePanel + BottleneckAlerts.
- Layout: KpiBar on top, two-column body (machine status left, job queue right), bottleneck alerts at bottom
- Machine status list: simple table of machine names + status dots + current job
- Manager-only: toggle machine down status (uses `useUpdateMachineStatus`)

- [ ] **Step 6: Create MachineGridTab component**

Create `client/src/components/dashboard/MachineGridTab.tsx`:

Grid of MachineCard components.
- Layout: `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- Full-screen button: hides sidebar/header, stores preference in localStorage
- When in full-screen: larger cards, removes page padding
- Auto-refresh every 15 seconds (pass `refetchInterval={15000}` to hook)

- [ ] **Step 7: Create ProductionDashboard page**

Create `client/src/pages/ProductionDashboard.tsx`:

```typescript
import { useState } from 'react';
import { useProductionDashboard } from '../hooks/useDashboard';
import CommandCenterTab from '../components/dashboard/CommandCenterTab';
import MachineGridTab from '../components/dashboard/MachineGridTab';

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState<'command' | 'grid'>('command');
  const refetchInterval = activeTab === 'command' ? 30000 : 15000;
  const { data, isLoading, error } = useProductionDashboard(refetchInterval);

  // Tab bar + content rendering
  // Loading/error states
  // Pass data to active tab component
}
```

- Tab bar styled like existing tabs in the project (check `client/src/components/ui/Tabs.tsx`)
- Tabs: "Command Center" and "Machine Grid"

- [ ] **Step 8: Add route and nav item**

In `client/src/App.tsx`, add:
```typescript
import ProductionDashboard from './pages/ProductionDashboard';
// Inside the protected layout routes:
<Route path="dashboard/production" element={<ProductionDashboard />} />
```

In `client/src/components/layout/AppLayout.tsx`, add to navItems:
```typescript
{ label: 'Production Dashboard', path: '/dashboard/production', icon: <ChartBar size={20} weight="regular" />, roles: ['admin', 'manager'] },
```

Import `ChartBar` from `@phosphor-icons/react`.

- [ ] **Step 9: Verify full build**

```bash
cd client && npm run build
```

Navigate to `/dashboard/production` — should see the dashboard with both tabs.

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/ProductionDashboard.tsx client/src/components/dashboard/ client/src/App.tsx client/src/components/layout/AppLayout.tsx
git commit -m "feat: add production dashboard with Command Center and Machine Grid tabs"
```

---

## Phase 3: Reporting & Export

### Task 23: CSV export utility

**Files:**
- Create: `client/src/utils/exportCsv.ts`

- [ ] **Step 1: Create CSV export utility**

Create `client/src/utils/exportCsv.ts`:

```typescript
/**
 * Generates a CSV file and triggers a browser download.
 * Handles quoting of values containing commas, quotes, or newlines.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escape = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/exportCsv.ts
git commit -m "feat: add CSV export utility"
```

---

### Task 24: Add export buttons to existing pages

**Files:**
- Modify: `client/src/pages/Jobs.tsx`
- Modify: `client/src/pages/Clients.tsx`
- Modify: `client/src/pages/PartsTracking.tsx`
- Modify: `client/src/pages/SupplyChain.tsx` (inventory + purchase orders)
- Modify: `client/src/pages/Engineering.tsx` (BOM + PBOM)
- Modify: `client/src/pages/JobDetail.tsx` (labor entries)

Use this pattern for every page. Add import once at the top of each file, then add a button per table.

**Shared pattern:**
```typescript
import { exportToCsv } from '../utils/exportCsv';
import { DownloadSimple } from '@phosphor-icons/react';

// Export button (place top-right of the table it exports):
<button
  onClick={() => exportToCsv('filename', ['Col1', 'Col2'], rows.map(r => [r.col1, r.col2]))}
  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
>
  <DownloadSimple size={16} weight="regular" />
  Export
</button>
```

- [ ] **Step 1: Add export to Jobs page**

Columns: Job Number, Client, Description, Priority, Status, Target Start Date, Target End Date

- [ ] **Step 2: Add export to Clients page**

Columns: Name, Contact, Email, Phone, Address

- [ ] **Step 3: Add export to PartsTracking page**

Columns: Tracking ID, Job Number, Part Number, Description, Status, Route Template

- [ ] **Step 4: Add export to SupplyChain page — Inventory table**

Columns: Part Number, Description, Quantity On Hand, Reorder Level, Unit Cost, Supplier

- [ ] **Step 5: Add export to SupplyChain page — Purchase Orders table**

Columns: PO Number, Description, Vendor, Qty Ordered, Qty Received, Status, Expected Date

- [ ] **Step 6: Add export to Engineering page — BOM table**

Columns: Part Number, Description, Quantity, Unit, Material, Supplier, Unit Cost, Total Cost

- [ ] **Step 7: Add export to Engineering page — PBOM table**

Columns: Part Number, Description, Quantity, Status, Ordered By, Expected Date

- [ ] **Step 8: Add export to JobDetail — Labor entries tab**

Columns: Employee, Date, Hours, Stage, Notes

- [ ] **Step 9: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/Jobs.tsx client/src/pages/Clients.tsx client/src/pages/PartsTracking.tsx client/src/pages/SupplyChain.tsx client/src/pages/Engineering.tsx client/src/pages/JobDetail.tsx
git commit -m "feat: add CSV export buttons to all major data tables"
```

---

### Task 25: Reports KPI backend endpoint

**Files:**
- Create: `server/src/controllers/reports.controller.ts`
- Create: `server/src/routes/reports.routes.ts`
- Modify: `server/src/server.ts`

- [ ] **Step 1: Create reports controller**

Create `server/src/controllers/reports.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

export const getKpiReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;

    // Validate date format to prevent malformed queries
    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (from && !isValidDate(from)) { res.status(400).json({ error: 'Invalid from date' }); return; }
    if (to && !isValidDate(to)) { res.status(400).json({ error: 'Invalid to date' }); return; }

    const hasDateRange = !!(from && to);

    // Jobs completed in range
    const completedResult = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Completed' AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Completed'`
        );

    // Average cycle time (days)
    const cycleTimeResult = hasDateRange
      ? await queryOne<{ avg_days: string }>(
          `SELECT COALESCE(AVG(EXTRACT(DAY FROM (completed_date::timestamp - start_date::timestamp))), 0)::text as avg_days
           FROM jobs WHERE status = 'Completed' AND start_date IS NOT NULL AND completed_date IS NOT NULL
           AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await queryOne<{ avg_days: string }>(
          `SELECT COALESCE(AVG(EXTRACT(DAY FROM (completed_date::timestamp - start_date::timestamp))), 0)::text as avg_days
           FROM jobs WHERE status = 'Completed' AND start_date IS NOT NULL AND completed_date IS NOT NULL`
        );

    // On-time rate
    const onTimeResult = hasDateRange
      ? await query<{ on_time: boolean }>(
          `SELECT (completed_date <= target_end_date) as on_time FROM jobs
           WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL
           AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await query<{ on_time: boolean }>(
          `SELECT (completed_date <= target_end_date) as on_time FROM jobs
           WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL`
        );
    const onTimeRate = onTimeResult.length > 0
      ? Math.round((onTimeResult.filter(r => r.on_time).length / onTimeResult.length) * 100)
      : 100;

    // Scrap rate
    const totalParts = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE updated_at BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts`);
    const scrappedParts = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE status = 'Scrapped' AND updated_at BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE status = 'Scrapped'`);
    const scrapRate = parseInt(totalParts?.count || '0') > 0
      ? Math.round((parseInt(scrappedParts?.count || '0') / parseInt(totalParts?.count || '1')) * 100)
      : 0;

    // Total labor hours
    const laborResult = hasDateRange
      ? await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(hours), 0)::text as total FROM job_labor WHERE date BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(hours), 0)::text as total FROM job_labor`);

    // Labor by stage
    const laborByStage = hasDateRange
      ? await query<{ stage_name: string; total_hours: string }>(
          `SELECT COALESCE(ws.name, 'Unspecified') as stage_name, SUM(jl.hours)::text as total_hours
           FROM job_labor jl LEFT JOIN workflow_stages ws ON ws.id = jl.stage_id
           WHERE jl.date BETWEEN $1 AND $2 GROUP BY ws.name ORDER BY ws.name`, [from, to])
      : await query<{ stage_name: string; total_hours: string }>(
          `SELECT COALESCE(ws.name, 'Unspecified') as stage_name, SUM(jl.hours)::text as total_hours
           FROM job_labor jl LEFT JOIN workflow_stages ws ON ws.id = jl.stage_id
           GROUP BY ws.name ORDER BY ws.name`);

    res.json({
      jobsCompleted: parseInt(completedResult?.count || '0'),
      avgCycleTimeDays: parseFloat(parseFloat(cycleTimeResult?.avg_days || '0').toFixed(1)),
      onTimeRate,
      scrapRate,
      totalLaborHours: parseFloat(parseFloat(laborResult?.total || '0').toFixed(1)),
      laborByStage: Object.fromEntries(
        laborByStage.map(r => [r.stage_name, parseFloat(parseFloat(r.total_hours).toFixed(1))])
      ),
    });
  } catch (error) {
    console.error('Error fetching KPI report:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
};
```

- [ ] **Step 2: Create reports routes**

Create `server/src/routes/reports.routes.ts`:

```typescript
import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import { getKpiReport } from '../controllers/reports.controller';

const router = Router();

router.get('/kpis', requireRole('admin', 'manager'), getKpiReport);

export default router;
```

- [ ] **Step 3: Mount in server.ts**

```typescript
import reportsRouter from './routes/reports.routes';
app.use('/api/reports', reportsRouter);
```

- [ ] **Step 4: Verify server builds and endpoint works**

```bash
cd server && npm run build
curl http://localhost:3001/api/reports/kpis
```

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/reports.controller.ts server/src/routes/reports.routes.ts server/src/server.ts
git commit -m "feat: add KPI reports endpoint with date range filtering"
```

---

### Task 26: Reports types, service, and hook

**Files:**
- Modify: `shared/types/index.ts`
- Create: `client/src/services/reports.service.ts`
- Create: `client/src/hooks/useReports.ts`

- [ ] **Step 1: Add report types**

Append to `shared/types/index.ts`:

```typescript
// ============================================================
// REPORTS
// ============================================================

export interface KpiReport {
  jobsCompleted: number;
  avgCycleTimeDays: number;
  onTimeRate: number;
  scrapRate: number;
  totalLaborHours: number;
  laborByStage: Record<string, number>;
}

export interface ReportFilters {
  from?: string;
  to?: string;
}
```

- [ ] **Step 2: Create reports service**

Create `client/src/services/reports.service.ts`:

```typescript
import api from './api';
import type { KpiReport } from '../types';

export async function getKpiReport(from?: string, to?: string): Promise<KpiReport> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data } = await api.get(`/reports/kpis?${params.toString()}`);
  return data;
}
```

- [ ] **Step 3: Create reports hook**

Create `client/src/hooks/useReports.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import * as reportsService from '../services/reports.service';

export function useKpiReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'kpis', from, to],
    queryFn: () => reportsService.getKpiReport(from, to),
  });
}
```

- [ ] **Step 4: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add shared/types/index.ts client/src/services/reports.service.ts client/src/hooks/useReports.ts
git commit -m "feat: add reports types, service, and hook"
```

---

### Task 27: Reports page

**Files:**
- Create: `client/src/pages/Reports.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create Reports page**

Create `client/src/pages/Reports.tsx`:

A KPI summary page with:
- Date range selector: dropdown with "This Week", "This Month", "Last 30 Days", "Last 90 Days", "All Time"
- Use `date-fns` (already installed) to compute date ranges:
  ```typescript
  import { subDays, startOfWeek, startOfMonth, format } from 'date-fns';
  ```
- KPI cards (same style as KpiBar): Jobs Completed, Avg Cycle Time (days), On-Time Rate (%), Scrap Rate (%)
- Labor hours section: total + breakdown by stage as a simple table
- CSV export button: exports all KPI data

Uses `useKpiReport(from, to)` hook.

- [ ] **Step 2: Add route and nav item**

In `client/src/App.tsx`:
```typescript
import Reports from './pages/Reports';
// Inside protected layout routes:
<Route path="reports" element={
  <ProtectedRoute roles={['admin', 'manager']}>
    <Reports />
  </ProtectedRoute>
} />
```

In `client/src/components/layout/AppLayout.tsx`, add to navItems:
```typescript
{ label: 'Reports', path: '/reports', icon: <ChartLineUp size={20} weight="regular" />, roles: ['admin', 'manager'] },
```

Import `ChartLineUp` from `@phosphor-icons/react`.

- [ ] **Step 3: Verify full client build**

```bash
cd client && npm run build
```

Navigate to `/reports` — should see KPI cards with date range filter.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Reports.tsx client/src/App.tsx client/src/components/layout/AppLayout.tsx
git commit -m "feat: add KPI reports page with date range filtering"
```

---

### Task 28: Add export to Audit Log page

**Files:**
- Modify: `client/src/pages/AuditLog.tsx`

- [ ] **Step 1: Add CSV export to audit log**

In the AuditLog page (created in Task 16), add an export button that exports the current page of audit entries:

```typescript
import { exportToCsv } from '../utils/exportCsv';

const handleExport = () => {
  if (!data?.data) return;
  exportToCsv('audit_log',
    ['Timestamp', 'User', 'Action', 'Table', 'Record ID'],
    data.data.map(e => [e.createdAt, e.userName, e.action, e.tableName, e.recordId || ''])
  );
};
```

- [ ] **Step 2: Verify client builds**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AuditLog.tsx
git commit -m "feat: add CSV export to audit log page"
```

---

### Task 29: Update CLAUDE.md to fix stale SQLite references

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update tech stack references**

In `CLAUDE.md`, update all references from SQLite to PostgreSQL:

1. Change `SQLite (sql.js)` to `PostgreSQL (Supabase)` in the tech stack line
2. Change `Feature works end-to-end with the SQLite database running` to `Feature works end-to-end with the Supabase PostgreSQL database`
3. Update the codebase map to remove `capsule_erp.db` reference and note Supabase connection
4. Add note about `@supabase/supabase-js` in both client and server

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: fix stale SQLite references in CLAUDE.md, update to PostgreSQL/Supabase"
```

---

### Task 30: Final integration verification

- [ ] **Step 1: Full build check**

```bash
cd server && npm run build && cd ../client && npm run build
```

Expected: Both build cleanly with zero errors.

- [ ] **Step 2: Start both servers and smoke test**

```bash
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

Verify:
1. `/login` page renders
2. `/` (dashboard) loads (with AUTH_REQUIRED=false)
3. `/dashboard/production` shows Command Center and Machine Grid tabs
4. `/reports` shows KPI cards with date filter
5. `/admin/users` shows user management table
6. `/admin/audit-log` shows audit log with filters
7. Export buttons work on Jobs, Clients, Parts Tracking pages
8. Sidebar shows correct items

- [ ] **Step 3: Test with AUTH_REQUIRED=true**

Set `AUTH_REQUIRED=true` in `server/.env`, restart server.
1. All pages redirect to `/login` when not authenticated
2. Login with admin credentials works
3. Role-based access works (operator can't see admin pages)

- [ ] **Step 4: Final commit of any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from final verification"
```
