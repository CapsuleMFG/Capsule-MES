# Auth Security Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Capsule ERP authentication — server-proxied login with rate limiting/lockout, kiosk JWT auth, password strength enforcement, password reset flow, idle timeout, and dev bypass safety.

**Architecture:** Authentication moves from client-side Supabase SDK calls to server-proxied Express endpoints for login/logout/reset, giving the server full control over rate limiting, lockout, and audit logging. Kiosk PIN auth issues signed JWTs instead of trusting raw headers. Frontend adds idle timeout auto-logout.

**Tech Stack:** Express, Supabase Auth (GoTrue), jsonwebtoken, bcrypt, express-rate-limit, React, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-auth-security-hardening-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/src/lib/validation.ts` | Password strength validation utility |
| `server/src/controllers/auth.controller.ts` | Login, logout, forgot-password, reset-password handlers |
| `server/src/routes/auth.routes.ts` | Auth endpoints with route-level rate limiters |
| `server/database/migrations/035_auth_security.sql` | `login_attempts` table, `locked_until` column on profiles |
| `client/src/hooks/useIdleTimeout.ts` | Auto-logout after 30min idle |
| `client/src/pages/ForgotPassword.tsx` | Forgot password email form page |
| `client/src/pages/ResetPassword.tsx` | Reset password form (reads token from URL) |

### Modified Files
| File | What Changes |
|------|-------------|
| `shared/types/index.ts` | Add `token` to `StationAuthResponse`; expand `AuditLogEntry.action` union |
| `server/package.json` | Add `jsonwebtoken` + `@types/jsonwebtoken` |
| `server/src/middleware/audit.ts` | Expand `action` type to include auth events |
| `server/src/lib/validation.ts` | (new file — listed for clarity) |
| `server/src/middleware/auth.ts` | Kiosk JWT verification; dev bypass header; add `/api/auth/logout` to publicPaths |
| `server/src/controllers/station-kiosks.controller.ts` | Sign and return JWT on PIN auth success |
| `server/src/controllers/profiles.controller.ts` | Password validation on user creation |
| `server/src/server.ts` | Mount auth routes; production startup guard |
| `client/src/contexts/AuthContext.tsx` | Login via Express API; integrate idle timeout |
| `client/src/services/auth.service.ts` | Login/logout/forgot/reset via Express API |
| `client/src/services/api.ts` | Kiosk JWT Bearer token; remove raw header logic |
| `client/src/contexts/KioskContext.tsx` | Accept full `StationAuthResponse`; store JWT |
| `client/src/pages/kiosk/StationLogin.tsx` | Pass full result to `login()` |
| `client/src/components/auth/LoginPage.tsx` | Add forgot-password link |
| `client/src/App.tsx` | Add `/forgot-password` and `/reset-password` routes |

---

## Task 1: Install Dependencies & Run Database Migration

**Files:**
- Modify: `server/package.json`
- Create: `server/database/migrations/035_auth_security.sql`

- [ ] **Step 1: Install jsonwebtoken**

```bash
cd server && npm install jsonwebtoken && npm install --save-dev @types/jsonwebtoken
```

- [ ] **Step 2: Create the migration file**

Create `server/database/migrations/035_auth_security.sql`:

```sql
-- Login attempts tracking for rate limiting and lockout
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts (email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);

-- Account lockout column on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;
```

- [ ] **Step 3: Apply the migration**

Apply via Supabase MCP `apply_migration` tool with name `035_auth_security` and the SQL above.

- [ ] **Step 4: Verify migration applied**

Run via Supabase MCP `execute_sql`:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'login_attempts';
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'locked_until';
```
Expected: both queries return rows.

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/database/migrations/035_auth_security.sql
git commit -m "chore: add jsonwebtoken dependency and auth security migration"
```

---

## Task 2: Expand Shared Types & Audit Action Union

**Files:**
- Modify: `shared/types/index.ts:866-871` (StationAuthResponse)
- Modify: `shared/types/index.ts:924-934` (AuditLogEntry)
- Modify: `server/src/middleware/audit.ts:9-16` (logAudit action type)

- [ ] **Step 1: Add `token` to `StationAuthResponse`**

In `shared/types/index.ts`, find (line 866):
```typescript
export interface StationAuthResponse {
    stationName: string;
    kioskId: number;
    userId?: string;
    userName?: string;
}
```

Replace with:
```typescript
export interface StationAuthResponse {
    stationName: string;
    kioskId: number;
    userId?: string;
    userName?: string;
    authType?: 'station' | 'operator';
    token: string;
}
```

- [ ] **Step 2: Define AuditAction type and expand AuditLogEntry**

In `shared/types/index.ts`, find (line 924):
```typescript
export interface AuditLogEntry {
  id: number;
  userId: string | null;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
```

Replace with:
```typescript
export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKED'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_COMPLETE';

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  userName: string;
  action: AuditAction;
```

- [ ] **Step 3: Update `logAudit` in `server/src/middleware/audit.ts`**

In `server/src/middleware/audit.ts`, find (line 9):
```typescript
export async function logAudit(params: {
  user: AuthenticatedUser | undefined;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
```

Replace with:
```typescript
import type { AuditAction } from '../../../shared/types';

export async function logAudit(params: {
  user: AuthenticatedUser | undefined;
  action: AuditAction;
  tableName: string;
```

Also remove the existing `import type { AuthenticatedUser }` line and combine:
```typescript
import type { AuthenticatedUser } from './auth';
```
remains as-is — we're just adding the `AuditAction` import.

- [ ] **Step 4: Verify build**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add shared/types/index.ts server/src/middleware/audit.ts
git commit -m "feat: expand audit action types and StationAuthResponse for auth hardening"
```

---

## Task 3: Password Validation Utility

**Files:**
- Create: `server/src/lib/validation.ts`

- [ ] **Step 1: Create the validation utility**

Create `server/src/lib/validation.ts`:

```typescript
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password strength.
 * Rules: min 8 chars, at least one uppercase, one lowercase, one digit.
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/validation.ts
git commit -m "feat: add password strength validation utility"
```

---

## Task 4: Add Password Validation to User Creation

**Files:**
- Modify: `server/src/controllers/profiles.controller.ts:72-98`

- [ ] **Step 1: Add validation import and check in `createProfile`**

In `server/src/controllers/profiles.controller.ts`, add import at top (after existing imports):

```typescript
import { validatePassword } from '../lib/validation';
```

Then in the `createProfile` function, after the role validation block (line 83-85: `if (!validRoles.includes(role))...`), add:

```typescript
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/profiles.controller.ts
git commit -m "feat: enforce password strength on user creation"
```

---

## Task 5: Auth Controller — Login with Rate Limiting & Lockout

**Files:**
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/auth.routes.ts`

- [ ] **Step 1: Create the auth controller**

Create `server/src/controllers/auth.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { query, queryOne } from '../models/database';
import { logAudit } from '../middleware/audit';
import { validatePassword } from '../lib/validation';
import { logger } from '../lib/logger';

/**
 * POST /api/auth/login
 * Server-proxied login with rate limiting and account lockout.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    // Check account lockout (join profiles via auth.users email)
    const profile = await queryOne<{ id: string; name: string; locked_until: string | null }>(
      `SELECT p.id, p.name, p.locked_until
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
      await logAudit({
        user: undefined,
        action: 'LOGIN_FAILURE',
        tableName: 'auth',
        recordId: null,
        newValues: { email, reason: 'account_locked', ip },
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Attempt sign-in via Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      // Log failed attempt
      await query(
        'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, false)',
        [email.toLowerCase(), ip]
      );

      // Check if we need to lock the account
      const recentFailures = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE email = $1 AND success = false AND attempted_at > NOW() - INTERVAL '15 minutes'`,
        [email.toLowerCase()]
      );

      if (recentFailures && parseInt(recentFailures.count) >= 10) {
        // Lock the account for 15 minutes
        if (profile) {
          await query(
            `UPDATE profiles SET locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $1`,
            [profile.id]
          );
          await logAudit({
            user: undefined,
            action: 'ACCOUNT_LOCKED',
            tableName: 'profiles',
            recordId: profile.id,
            newValues: { email, reason: '10_failed_attempts', ip },
          });
        }
      }

      await logAudit({
        user: undefined,
        action: 'LOGIN_FAILURE',
        tableName: 'auth',
        recordId: null,
        newValues: { email, ip },
      });

      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Success — log attempt and clear any lockout
    await query(
      'INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, true)',
      [email.toLowerCase(), ip]
    );

    if (profile?.locked_until) {
      await query('UPDATE profiles SET locked_until = NULL WHERE id = $1', [profile.id]);
    }

    await logAudit({
      user: { id: data.user.id, email: data.user.email || '', name: profile?.name || '', role: 'operator' as const },
      action: 'LOGIN_SUCCESS',
      tableName: 'auth',
      recordId: data.user.id,
      newValues: { ip },
    });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * POST /api/auth/logout
 * Server-side logout with audit logging. On publicPaths — works even with expired tokens.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let userId: string | undefined;
    let userName = 'unknown';

    // Try to resolve user from token (best-effort — token may be expired)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
          const profile = await queryOne<{ name: string }>('SELECT name FROM profiles WHERE id = $1', [user.id]);
          userName = profile?.name || 'unknown';
          // Sign out the user on Supabase side
          await supabaseAdmin.auth.admin.signOut(user.id);
        }
      } catch {
        // Token expired or invalid — that's fine for logout
      }
    }

    await logAudit({
      user: userId ? { id: userId, email: '', name: userName, role: 'operator' as const } : undefined,
      action: 'LOGOUT',
      tableName: 'auth',
      recordId: userId || null,
      newValues: {},
    });

    res.json({ message: 'Logged out' });
  } catch (error) {
    logger.error('Logout error', { error: error instanceof Error ? error.message : error });
    // Logout should always succeed from the client's perspective
    res.json({ message: 'Logged out' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Sends password reset email via Supabase. Always returns 200 (no email enumeration).
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
    });

    await logAudit({
      user: undefined,
      action: 'PASSWORD_RESET_REQUEST',
      tableName: 'auth',
      recordId: null,
      newValues: { email },
    });
  } catch (error) {
    // Log but don't expose errors to prevent email enumeration
    logger.error('Forgot password error', { error: error instanceof Error ? error.message : error });
  }

  // Always return 200 regardless of whether email exists
  res.json({ message: 'If that email exists, you will receive a reset link' });
};

/**
 * POST /api/auth/reset-password
 * Validates password strength, then updates via Supabase admin API.
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { access_token, password } = req.body;

  if (!access_token || !password) {
    res.status(400).json({ error: 'Access token and new password are required' });
    return;
  }

  // Validate password strength
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    res.status(400).json({ error: passwordCheck.error });
    return;
  }

  try {
    // Exchange access_token for user ID
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(access_token);

    if (getUserError || !user) {
      res.status(401).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      logger.error('Password update failed', { error: updateError.message, userId: user.id });
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    await logAudit({
      user: { id: user.id, email: user.email || '', name: '', role: 'operator' as const },
      action: 'PASSWORD_RESET_COMPLETE',
      tableName: 'auth',
      recordId: user.id,
      newValues: {},
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Reset password error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
```

- [ ] **Step 2: Create the auth routes with rate limiters**

Create `server/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = Router();

// Strict rate limit for login: 5 attempts per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for forgot-password: 3 per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
```

- [ ] **Step 3: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/auth.controller.ts server/src/routes/auth.routes.ts
git commit -m "feat: add auth controller with login/logout/forgot/reset endpoints and rate limiting"
```

---

## Task 6: Mount Auth Routes & Production Startup Guard

**Files:**
- Modify: `server/src/server.ts:23-33` (imports), `server/src/server.ts:86-88` (auth middleware area), `server/src/server.ts:139-155` (startServer)

- [ ] **Step 1: Add auth route import**

In `server/src/server.ts`, after the existing route imports (around line 32), add:

```typescript
import authRouter from './routes/auth.routes';
```

- [ ] **Step 2: Mount auth routes BEFORE authMiddleware**

**CRITICAL:** Auth routes (login, forgot-password, reset-password) must be accessible WITHOUT authentication. They MUST be mounted physically BEFORE `app.use(authMiddleware)` in the file — NOT alongside the other `app.use('/api/...')` route mounts at lines 95-118. If placed after authMiddleware, unauthenticated requests to `/api/auth/login` will get 401.

In `server/src/server.ts`, find the auth middleware line (line 87):

```typescript
// Auth middleware — applied globally, behavior controlled by AUTH_REQUIRED env var
app.use(authMiddleware);
```

Add **immediately BEFORE** it (line 86):

```typescript
// Auth routes — mounted BEFORE authMiddleware since login/forgot-password are unauthenticated
app.use('/api/auth', authRouter);
```

- [ ] **Step 3: Add production startup guard**

In `server/src/server.ts`, find the `startServer` function (line 139). Add at the very beginning, before `logger.info('Initializing database...')`:

```typescript
    // Production safety: refuse to start without auth properly configured
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SUPABASE_URL) {
        logger.error('FATAL: SUPABASE_URL is not set. Cannot start in production without auth backend.');
        process.exit(1);
      }
      if (process.env.AUTH_REQUIRED?.toLowerCase() !== 'true') {
        logger.error('FATAL: AUTH_REQUIRED must be "true" in production. Dev bypass would be active.');
        process.exit(1);
      }
    }
```

- [ ] **Step 4: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/src/server.ts
git commit -m "feat: mount auth routes and add production startup safety guard"
```

---

## Task 7: Auth Middleware — Kiosk JWT Verification & Dev Bypass Header

**Files:**
- Modify: `server/src/middleware/auth.ts`

- [ ] **Step 1: Rewrite auth middleware with kiosk JWT support**

Replace the entire content of `server/src/middleware/auth.ts` with:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../lib/supabase';
import { queryOne } from '../models/database';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'supply_chain' | 'operator';
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface KioskJwtPayload {
  type: 'kiosk';
  kioskId: number;
  stationName: string;
  userId?: string;
  userName?: string;
  authType: 'station' | 'operator';
  role: string;
}

const DEV_USER: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@capsule.local',
  name: 'Dev User',
  role: 'admin',
};

const KIOSK_JWT_SECRET = process.env.KIOSK_JWT_SECRET || '';

// Log dev bypass warning once at startup
const isProduction = process.env.NODE_ENV === 'production';
const authRequired = process.env.AUTH_REQUIRED?.toLowerCase() === 'true';
if (!isProduction && !authRequired) {
  logger.warn('AUTH DISABLED — dev bypass active. Set AUTH_REQUIRED=true for production.');
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Public endpoints that don't require auth
  const publicPaths = ['/api/station-kiosks/auth', '/api/auth/logout', '/health'];
  if (publicPaths.some(p => req.path === p)) {
    return next();
  }

  // Dev bypass — never active in production (startup guard prevents it)
  if (!isProduction && !authRequired) {
    res.setHeader('X-Auth-Mode', 'dev-bypass');
    req.user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Step 1: Peek at the token to check if it's a kiosk JWT
  const decoded = jwt.decode(token) as Record<string, unknown> | null;

  if (decoded && decoded.type === 'kiosk') {
    // This is a kiosk token — verify it with KIOSK_JWT_SECRET
    if (!KIOSK_JWT_SECRET) {
      logger.error('KIOSK_JWT_SECRET is not configured');
      res.status(500).json({ error: 'Kiosk authentication not configured' });
      return;
    }

    try {
      const payload = jwt.verify(token, KIOSK_JWT_SECRET) as KioskJwtPayload;
      req.user = {
        id: payload.userId || `kiosk-${payload.kioskId}`,
        email: '',
        name: payload.userName || payload.stationName,
        role: (payload.role as AuthenticatedUser['role']) || 'operator',
      };
      return next();
    } catch (err) {
      // Kiosk token is expired or tampered — do NOT fall through to Supabase
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Kiosk session expired' });
      } else {
        res.status(401).json({ error: 'Invalid kiosk token' });
      }
      return;
    }
  }

  // Step 2: Not a kiosk token — validate with Supabase
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

    // Validate role at runtime
    const validRoles: AuthenticatedUser['role'][] = ['admin', 'manager', 'engineer', 'supply_chain', 'operator'];
    if (!validRoles.includes(profile.role as AuthenticatedUser['role'])) {
      logger.warn('Unknown role in profile', { userId: user.id, role: profile.role });
      res.status(403).json({ error: 'Invalid user role' });
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
    logger.error('Auth middleware error', { error: error instanceof Error ? error.message : error });
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat: replace kiosk raw headers with JWT verification; add dev bypass header"
```

---

## Task 8: Kiosk PIN Auth — Issue Signed JWT

**Files:**
- Modify: `server/src/controllers/station-kiosks.controller.ts:94-144`

- [ ] **Step 1: Add JWT signing to `authenticateStation`**

In `server/src/controllers/station-kiosks.controller.ts`, add import at top:

```typescript
import jwt from 'jsonwebtoken';
```

Then replace the `authenticateStation` function (lines 94-144) with:

```typescript
/** POST /api/station-kiosks/auth */
export const authenticateStation = async (req: Request, res: Response) => {
  try {
    const { pinCode } = req.body;
    if (!pinCode) {
      res.status(400).json({ error: 'PIN code is required' });
      return;
    }

    const KIOSK_JWT_SECRET = process.env.KIOSK_JWT_SECRET;
    if (!KIOSK_JWT_SECRET) {
      logger.error('KIOSK_JWT_SECRET is not configured');
      res.status(500).json({ error: 'Kiosk authentication not configured' });
      return;
    }

    // Step 1: Check station kiosk PINs (station identification)
    const kiosks = await query<{ id: number; station_name: string; pin_code: string; machine_id: number | null }>(
      `SELECT id, station_name, pin_code, machine_id FROM station_kiosks WHERE pin_code IS NOT NULL AND is_active = true`
    );

    for (const kiosk of kiosks) {
      const match = await bcrypt.compare(pinCode, kiosk.pin_code);
      if (match) {
        const token = jwt.sign(
          {
            type: 'kiosk',
            kioskId: kiosk.id,
            stationName: kiosk.station_name.trim(),
            machineId: kiosk.machine_id,
            authType: 'station',
            role: 'operator',
          },
          KIOSK_JWT_SECRET,
          { expiresIn: '8h' }
        );

        res.json({
          kioskId: kiosk.id,
          stationName: kiosk.station_name.trim(),
          machineId: kiosk.machine_id,
          authType: 'station',
          token,
        });
        return;
      }
    }

    // Step 2: Check operator profile PINs (operator identification)
    const profilesWithPin = await query<{ id: string; name: string; pin: string }>(
      `SELECT id, name, pin FROM profiles WHERE pin IS NOT NULL AND is_active = true`
    );

    for (const profile of profilesWithPin) {
      const match = await bcrypt.compare(pinCode, profile.pin);
      if (match) {
        const token = jwt.sign(
          {
            type: 'kiosk',
            kioskId: 0,
            stationName: profile.name,
            userId: profile.id,
            userName: profile.name,
            authType: 'operator',
            role: 'operator',
          },
          KIOSK_JWT_SECRET,
          { expiresIn: '8h' }
        );

        res.json({
          kioskId: 0,
          stationName: profile.name,
          userId: profile.id,
          userName: profile.name,
          authType: 'operator',
          token,
        });
        return;
      }
    }

    res.status(401).json({ error: 'Invalid PIN' });
  } catch (error) {
    logger.error('Kiosk auth error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Authentication failed' });
  }
};
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/station-kiosks.controller.ts
git commit -m "feat: issue signed JWT on kiosk PIN authentication"
```

---

## Task 9: Frontend — Login via Express API & Kiosk JWT

**Files:**
- Modify: `client/src/services/auth.service.ts`
- Modify: `client/src/contexts/AuthContext.tsx`
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Update auth.service.ts to login via Express API**

In `client/src/services/auth.service.ts`, replace the `login` function (lines 6-11):

```typescript
export async function login(email: string, password: string) {
  if (!supabase) throw new Error('Auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
```

with:

```typescript
export async function login(email: string, password: string) {
  if (!supabase) throw new Error('Auth not configured');
  const { data } = await api.post('/auth/login', { email, password });
  // Set the session into Supabase client for token refresh
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  return data;
}
```

Also add after the `logout` function:

```typescript
export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(accessToken: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { access_token: accessToken, password });
}
```

And update the `logout` function to call the server:

```typescript
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logout should always succeed on the client side
  }
  if (supabase) {
    await supabase.auth.signOut();
  }
}
```

- [ ] **Step 2: Update AuthContext.tsx login to use auth.service**

In `client/src/contexts/AuthContext.tsx`, replace the `login` function (lines 67-72):

```typescript
  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Profile will be loaded by onAuthStateChange SIGNED_IN event
  };
```

with:

```typescript
  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    await authLogin(email, password);
    // Profile will be loaded by onAuthStateChange SIGNED_IN event
  };
```

And add the import at the top (modify the existing import from auth.service):

```typescript
import { getMyProfile, logout as authLogout, login as authLogin } from '../services/auth.service';
```

Also update the `logout` function (lines 74-77) and wrap it in `useCallback` so it's stable for the idle timeout hook:

```typescript
  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);
```

Add `useCallback` to the React import if not already there.

Remove the direct `supabase` import if it's no longer used elsewhere in this file. Check: `supabase` is still used in `useEffect` for `getSession()` and `onAuthStateChange` — so keep the import.

- [ ] **Step 3: Update api.ts — kiosk JWT Bearer token**

In `client/src/services/api.ts`, replace the kiosk fallback section in the request interceptor (lines 24-37):

```typescript
    // Fallback: kiosk auth via session storage
    const kioskData = sessionStorage.getItem('capsule_kiosk_station');
    if (kioskData) {
      try {
        const kiosk = JSON.parse(kioskData);
        if (kiosk.userId) {
          config.headers['X-Kiosk-User'] = kiosk.userId;
        } else if (kiosk.kioskId) {
          config.headers['X-Kiosk-Id'] = String(kiosk.kioskId);
        }
      } catch {
        // ignore parse errors
      }
    }
```

with:

```typescript
    // Fallback: kiosk auth via JWT in session storage
    const kioskToken = sessionStorage.getItem('capsule_kiosk_token');
    if (kioskToken) {
      config.headers.Authorization = `Bearer ${kioskToken}`;
    }
```

Also update the 401 response interceptor to call the server logout endpoint for audit logging. Replace the existing 401 handler block:

```typescript
    if (status === 401 && !isKioskRoute) {
      // Token expired or invalid — clear session (skip for kiosk pages)
      if (supabase) {
        await supabase.auth.signOut();
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
```

with:

```typescript
    if (status === 401 && !isKioskRoute) {
      // Token expired or invalid — notify server (fire-and-forget) then clear session
      try { await api.post('/auth/logout'); } catch { /* fire-and-forget */ }
      if (supabase) {
        await supabase.auth.signOut();
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
```

- [ ] **Step 4: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add client/src/services/auth.service.ts client/src/contexts/AuthContext.tsx client/src/services/api.ts
git commit -m "feat: route login/logout through Express API; use kiosk JWT Bearer token"
```

---

## Task 10: Frontend — Kiosk Context JWT Storage

**Files:**
- Modify: `client/src/contexts/KioskContext.tsx`
- Modify: `client/src/pages/kiosk/StationLogin.tsx:35-36`

- [ ] **Step 1: Update KioskContext.login() to accept full response and store JWT**

In `client/src/contexts/KioskContext.tsx`, add at top after imports:

```typescript
import type { StationAuthResponse } from '../../../shared/types';
```

Add a constant for the JWT storage key (after `STORAGE_KEY` on line 24):

```typescript
const TOKEN_KEY = 'capsule_kiosk_token';
```

Replace the `login` signature in the interface (line 15):

```typescript
  login: (stationName: string, kioskId: number, userId?: string, userName?: string) => void;
```

with:

```typescript
  login: (result: StationAuthResponse) => void;
```

Replace the `login` callback (lines 38-43):

```typescript
  const login = useCallback((stationName: string, kioskId: number, userId?: string, userName?: string) => {
    const state: KioskState = { stationName, kioskId, userId, userName };
    setStation(state);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    navigate('/kiosk/machine');
  }, [navigate]);
```

with:

```typescript
  const login = useCallback((result: StationAuthResponse) => {
    const state: KioskState = {
      stationName: result.stationName,
      kioskId: result.kioskId,
      userId: result.userId,
      userName: result.userName,
    };
    setStation(state);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    sessionStorage.setItem(TOKEN_KEY, result.token);
    navigate('/kiosk/machine');
  }, [navigate]);
```

Update the `logout` callback (lines 66-70) to also remove the JWT:

```typescript
  const logout = useCallback(() => {
    setStation(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    navigate('/kiosk');
  }, [navigate]);
```

- [ ] **Step 2: Verify `authenticateStation` return type picks up `token`**

The `authenticateStation` function in `client/src/services/parts-tracking.service.ts:173` already returns `Promise<StationAuthResponse>`. Since we added `token: string` to `StationAuthResponse` in Task 2, this function's return type automatically includes the JWT. No code change needed — just verify `parts-tracking.service.ts` imports `StationAuthResponse` from shared types.

- [ ] **Step 3: Update StationLogin.tsx to pass full result**

In `client/src/pages/kiosk/StationLogin.tsx`, replace line 36:

```typescript
      login(result.stationName, result.kioskId, result.userId, result.userName);
```

with:

```typescript
      login(result);
```

- [ ] **Step 4: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add client/src/contexts/KioskContext.tsx client/src/pages/kiosk/StationLogin.tsx
git commit -m "feat: store kiosk JWT in session storage on PIN auth"
```

---

## Task 11: Frontend — Idle Timeout Hook

**Files:**
- Create: `client/src/hooks/useIdleTimeout.ts`
- Modify: `client/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Create the idle timeout hook**

Create `client/src/hooks/useIdleTimeout.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auto-logout after 30 minutes of no user interaction.
 * Only active when `enabled` is true (i.e., user is authenticated).
 */
export function useIdleTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, IDLE_TIMEOUT_MS);
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer(); // Start the timer

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, resetTimer]);
}
```

- [ ] **Step 2: Integrate idle timeout in AuthContext**

In `client/src/contexts/AuthContext.tsx`, add import:

```typescript
import { useIdleTimeout } from '../hooks/useIdleTimeout';
```

Add inside the `AuthProvider` function, after the `logout` function but before the `return`:

```typescript
  // Auto-logout after 30 minutes of inactivity
  const handleIdleTimeout = useCallback(async () => {
    await logout();
    window.location.href = '/login';
  }, [logout]);

  useIdleTimeout(handleIdleTimeout, isAuthenticated);
```

Also add `useCallback` to the imports from React (it should already be there if not).

- [ ] **Step 3: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useIdleTimeout.ts client/src/contexts/AuthContext.tsx
git commit -m "feat: add 30-minute idle timeout auto-logout"
```

---

## Task 12: Frontend — Forgot Password & Reset Password Pages

**Files:**
- Create: `client/src/pages/ForgotPassword.tsx`
- Create: `client/src/pages/ResetPassword.tsx`
- Modify: `client/src/components/auth/LoginPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create ForgotPassword page**

Create `client/src/pages/ForgotPassword.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
    } catch {
      // Silently succeed — don't reveal whether email exists
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-100 rounded-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Reset Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              {submitted
                ? 'If that email exists, you will receive a reset link.'
                : 'Enter your email to receive a password reset link.'}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-600 text-center">Check your email for the reset link.</p>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ResetPassword page**

Create `client/src/pages/ResetPassword.tsx`:

```tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { resetPassword } from '../services/auth.service';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase puts tokens in the URL hash: #access_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (token) {
      setAccessToken(token);
    } else {
      setError('Invalid or missing reset link. Please request a new one.');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(accessToken, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error ? err.message : 'Failed to reset password';
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
            <h1 className="text-xl font-semibold text-gray-900">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              {success ? 'Password updated! Redirecting to login...' : 'Enter your new password.'}
            </p>
          </div>

          {!success && accessToken && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must include uppercase, lowercase, and a number.
                </p>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  placeholder="Re-enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-md disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          {!success && !accessToken && error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add forgot-password link to LoginPage**

In `client/src/components/auth/LoginPage.tsx`, add a Link import at the top:

```typescript
import { Navigate, Link } from 'react-router-dom';
```

(Replace the existing `import { Navigate } from 'react-router-dom';`)

Then after the submit button (line 90, before `</form>`), add:

```tsx
            <div className="text-center mt-2">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>
```

- [ ] **Step 4: Add routes to App.tsx**

In `client/src/App.tsx`, add imports:

```typescript
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
```

Then after the login route (line 50: `<Route path="/login" element={<LoginPage />} />`), add:

```tsx
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Step 5: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ForgotPassword.tsx client/src/pages/ResetPassword.tsx client/src/components/auth/LoginPage.tsx client/src/App.tsx
git commit -m "feat: add forgot-password and reset-password pages"
```

---

## Task 13: Full Build Verification

- [ ] **Step 1: Build server**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Build client**

```bash
cd client && npx tsc --noEmit && npm run build
```
Expected: no errors, successful Vite build.

- [ ] **Step 3: Verify no regressions — start both servers**

```bash
cd server && npm run dev &
cd client && npm run dev &
```

Manually verify:
- Main app loads at `http://localhost:5173`
- Login page renders with "Forgot password?" link
- Forgot-password page renders at `/forgot-password`
- Reset-password page renders at `/reset-password`
- Kiosk login still works at `/kiosk`

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from auth hardening"
```

---

## Summary of Security Properties Delivered

| Property | Task |
|----------|------|
| Login rate limited (5/min per IP) | Task 5 |
| Account lockout (10 failures = 15min lock) | Task 5 |
| Kiosk auth cryptographically verified (JWT) | Tasks 7, 8, 10 |
| Password strength enforced | Tasks 3, 4 |
| Password reset with token expiry | Task 5, 12 |
| Session idle timeout (30min) | Task 11 |
| Auth events audited | Tasks 2, 5 |
| Dev bypass safety guard | Tasks 6, 7 |
| Auth secrets not exposed to frontend | All tasks (KIOSK_JWT_SECRET server-only) |
