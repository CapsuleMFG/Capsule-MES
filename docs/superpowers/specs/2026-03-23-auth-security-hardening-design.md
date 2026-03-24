# Auth Security Hardening — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Harden Capsule MES authentication — rate limiting, kiosk JWT, password strength, password reset, session expiry, dev bypass safety, auth audit logging.

---

## Current State

Capsule MES uses Supabase Auth for user authentication (email/password via GoTrue, JWT tokens). Kiosk stations authenticate via bcrypt-hashed PINs. Role-based access control is enforced server-side via `requireRole()` middleware and client-side via `ProtectedRoute`.

### What's already solid
- Supabase Auth handles password hashing (bcrypt via GoTrue)
- JWT validation via `supabaseAdmin.auth.getUser(token)`
- Role-based access control with `requireRole()` middleware
- PINs are bcrypt-hashed (profiles + kiosk stations)
- PIN auth has rate limiting (10/min)
- Global API rate limiting (500/15min)
- Audit logging for profile CRUD
- Service role key is server-side only, anon key on client
- 401 interceptor auto-signs out and redirects

### Security gaps

| # | Issue | Severity |
|---|-------|----------|
| 1 | No login-specific rate limiting — global 500/15min allows brute-force | HIGH |
| 2 | No password strength enforcement on user creation | HIGH |
| 3 | Kiosk headers (`X-Kiosk-User`, `X-Kiosk-Id`) have no cryptographic verification — forgeable with just a UUID | CRITICAL |
| 4 | No password reset flow — users locked out permanently | MEDIUM |
| 5 | Dev bypass silently active when `AUTH_REQUIRED` isn't set | MEDIUM |
| 6 | No session idle timeout | MEDIUM |
| 7 | No failed login tracking or account lockout | MEDIUM |
| 8 | No auth event audit logging (login, logout, reset) | LOW |

---

## Design

### 1. Server-Proxied Login with Rate Limiting & Account Lockout

Move the login flow from client-side Supabase SDK to an Express API endpoint for server-side control.

**New endpoint:** `POST /api/auth/login`
- Accepts `{ email, password }`
- Proxies to `supabaseAdmin.auth.signInWithPassword({ email, password })` — the non-admin method, which works with the service role key. Note: `admin.signInWithPassword()` does not exist in the Supabase JS SDK.
- Returns the Supabase session (access_token, refresh_token) on success
- Rate limited: **5 attempts per minute per IP**
- Before calling Supabase, check `locked_until` on profiles (join via email on `auth.users`). If locked and `locked_until > NOW()`, return 401 immediately without attempting sign-in.
- Track failed attempts in `login_attempts` table (email, ip_address, attempted_at, success)
- After **10 failed attempts** for an email within 15 minutes, set `locked_until = NOW() + 15min` on the profiles table
- Always return generic `"Invalid credentials"` on failure — never reveal whether email exists
- Log auth events to audit_log: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCOUNT_LOCKED`

**Frontend change:** `AuthContext.login()` calls `POST /api/auth/login` instead of `supabase.auth.signInWithPassword()` directly. The response contains the tokens which are set into the Supabase client via `supabase.auth.setSession({ access_token, refresh_token })`.

**Note on client-side bypass:** The frontend still exports a Supabase client (`client/src/lib/supabase.ts`) which could theoretically be used from the browser console to call `supabase.auth.signInWithPassword()` directly, bypassing rate limiting and lockout. This is acceptable for an internal manufacturing MES (physical access required, known user base). The server-side rate limiter and lockout are defense-in-depth, not the sole control — Supabase's own rate limiting also applies.

**New endpoint:** `POST /api/auth/logout`
- Added to `publicPaths` in auth middleware — must be accessible even with an expired token (e.g., idle timeout triggers logout after token expiry)
- Accepts the Bearer token (if valid), resolves user for audit logging. If token is expired/invalid, still succeeds (fire-and-forget sign-out).
- Calls `supabaseAdmin.auth.admin.signOut(userId)` if user was resolved
- Logs `LOGOUT` audit event

### 2. Kiosk JWT Authentication

Replace forgeable raw headers with signed JWTs issued at PIN authentication time.

**Changes to `POST /api/station-kiosks/auth`:**
- On successful PIN verification, sign a JWT using `jsonwebtoken` with `KIOSK_JWT_SECRET` env var
- Token payload:
  ```json
  {
    "type": "kiosk",
    "kioskId": 5,
    "stationName": "Laser Bay 1",
    "userId": "uuid-or-null",
    "userName": "Operator Name",
    "authType": "station|operator",
    "role": "operator",
    "iat": 1234567890,
    "exp": 1234596690
  }
  ```
- Token expiry: **8 hours** (one shift)
- Return the JWT in the response alongside existing fields

**Auth middleware changes:**
- Remove the `X-Kiosk-User` / `X-Kiosk-Id` header handling entirely
- When a Bearer token is present, first attempt to decode as a kiosk JWT using `jwt.verify(token, KIOSK_JWT_SECRET)`:
  - If verified and `payload.type === "kiosk"`: construct `req.user` from the payload, call `next()`
  - If verification fails with `TokenExpiredError` or `JsonWebTokenError` AND the token's decoded payload has `type === "kiosk"`: return **401 immediately** ("Kiosk session expired" or "Invalid kiosk token"). Do NOT fall through to Supabase — an expired kiosk JWT is not a Supabase token.
  - If the token does not decode as a kiosk JWT at all (no `type` claim, or decoding fails because it's a Supabase JWT format): fall through to `supabaseAdmin.auth.getUser(token)` validation as before.
- Use `jwt.decode(token)` (no verification) first to peek at the `type` claim for routing, then `jwt.verify()` only if `type === "kiosk"`. If `jwt.decode()` returns `null` (malformed token) or the decoded payload has no `type` field, skip kiosk handling entirely and fall through to Supabase validation.

**Existing PIN rate limiter preservation:** The rate limiter (10/min) is currently defined in `server/src/routes/station-kiosks.routes.ts` as `pinAuthLimiter` applied to the `POST /auth` route. This must be preserved when modifying the controller — no changes needed to the route file.

**Frontend kiosk changes:**
- `KioskContext.tsx` must be updated: `login()` method signature changes to accept the full `StationAuthResponse` object (which now includes `token`). Inside `login()`, store the JWT in sessionStorage under `capsule_kiosk_token`, and continue storing non-auth state (station name, machine ID) under `capsule_kiosk_station` as before.
- `StationLogin.tsx` passes the full PIN auth response to `login(result)` instead of destructured positional arguments. The JWT storage happens inside `KioskContext.login()`.
- Axios interceptor in `api.ts` checks for `capsule_kiosk_token` in sessionStorage and sends it as `Authorization: Bearer <token>`. Remove all `X-Kiosk-User` / `X-Kiosk-Id` header logic.
- `shared/types/index.ts`: Update `StationAuthResponse` to include `token: string` field.

### 3. Password Strength Enforcement

**New utility:** `server/src/lib/validation.ts`
- `validatePassword(password: string): { valid: boolean; error?: string }`
- Rules: minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit
- No maximum length (bcrypt truncates at 72 bytes naturally)

**Enforcement points:**
- `POST /api/profiles` (create user) — validate before calling Supabase `createUser()`
- `POST /api/auth/reset-password` — validate new password before applying

**Error message:** `"Password must be at least 8 characters with uppercase, lowercase, and a number"`

Server is the authority. Frontend may mirror rules for UX but server always validates.

### 4. Password Reset Flow

Leverages Supabase's built-in reset token mechanism. No custom token generation.

**New endpoint:** `POST /api/auth/forgot-password`
- Accepts `{ email }`
- Calls `supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: '<frontend-url>/reset-password' })`
- Always returns 200 with `{ message: "If that email exists, you'll receive a reset link" }` (prevents email enumeration)
- Rate limited: **3 requests per 15 minutes per IP**
- Logs `PASSWORD_RESET_REQUEST` audit event

**New endpoint:** `POST /api/auth/reset-password`
- Accepts `{ access_token, password }` (Supabase puts tokens in the URL hash after email link click)
- Validates password strength via `validatePassword()`
- Exchanges the access_token for a user ID: `const { data: { user } } = await supabaseAdmin.auth.getUser(access_token)`
- Updates the password via admin API: `await supabaseAdmin.auth.admin.updateUserById(user.id, { password })`
- This keeps password reset server-authoritative — the client never calls Supabase auth directly for this flow
- Logs `PASSWORD_RESET_COMPLETE` audit event

**Supabase reset token expiry:** 1 hour (Supabase default). No custom expiry needed.

**Frontend pages:**
- **`/forgot-password`** — email input form, "Forgot password?" link on login page
- **`/reset-password`** — reads token from URL hash, new password form with confirmation field, calls reset endpoint

### 5. Session Expiry & Idle Timeout

**Token expiry:** Supabase defaults (1hr access token, auto-refresh via refresh token) are adequate. `supabaseAdmin.auth.getUser(token)` already rejects expired JWTs.

**Idle timeout:** New `useIdleTimeout` hook on the frontend.
- Listens for `mousemove`, `keydown`, `mousedown`, `touchstart` events
- Resets a 30-minute timer on each interaction
- On timeout: calls `logout()`, redirects to `/login`
- Mounted in `AuthProvider` (only when authenticated)

### 6. Dev Bypass Safety

**Startup guard:** If `NODE_ENV === 'production'`, enforce two checks before starting the server:
1. `SUPABASE_URL` must be set (otherwise no auth backend exists)
2. `AUTH_REQUIRED` must be `'true'` (otherwise the dev bypass in `auth.ts` will be active)
If either check fails, log a fatal error and call `process.exit(1)`. This is critical because the dev bypass logic in `auth.ts` depends on `AUTH_REQUIRED`, not `SUPABASE_URL` — a production deployment with `SUPABASE_URL` set but `AUTH_REQUIRED` unset would silently run with auth disabled.

**Loud warning:** When dev bypass is active (non-production, `AUTH_REQUIRED !== 'true'`), log on every request: `logger.warn('AUTH DISABLED — dev bypass active. Set AUTH_REQUIRED=true for production.')`  — but only log once at startup to avoid spam, not per-request.

**Debug header:** Add `X-Auth-Mode: dev-bypass` response header in dev mode so it's visible in browser devtools. Never send in production.

### 7. Email Verification

No change needed. Admin-created users are auto-confirmed (`email_confirm: true`) which is correct for an internal MES where admins create accounts for known employees. No self-registration exists.

---

## Database Migration

**Migration `035_auth_security.sql`:**

```sql
-- Login attempts tracking
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts (email, attempted_at);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);

-- Account lockout
ALTER TABLE profiles ADD COLUMN locked_until TIMESTAMPTZ NULL;
```

---

## File Changes

### New files

| File | Purpose |
|------|---------|
| `server/src/routes/auth.routes.ts` | Login, logout, forgot-password, reset-password endpoints with rate limiters |
| `server/src/controllers/auth.controller.ts` | Handler logic for all auth endpoints |
| `server/src/lib/validation.ts` | `validatePassword()` utility |
| `server/database/migrations/035_auth_security.sql` | `login_attempts` table, `locked_until` column |
| `client/src/pages/ForgotPassword.tsx` | Email input form for password reset |
| `client/src/pages/ResetPassword.tsx` | New password form (reads token from URL) |
| `client/src/hooks/useIdleTimeout.ts` | Auto-logout after 30min idle |

### Modified files

| File | Change |
|------|--------|
| `server/src/middleware/auth.ts` | Kiosk JWT verification replacing raw header trust; dev bypass header |
| `server/src/controllers/station-kiosks.controller.ts` | Issue signed JWT on successful PIN auth |
| `server/src/controllers/profiles.controller.ts` | Password validation on user creation |
| `server/src/server.ts` | Mount auth routes, production startup guard |
| `server/src/middleware/audit.ts` | Expand `action` type union to: `'CREATE' \| 'UPDATE' \| 'DELETE' \| 'LOGIN_SUCCESS' \| 'LOGIN_FAILURE' \| 'ACCOUNT_LOCKED' \| 'LOGOUT' \| 'PASSWORD_RESET_REQUEST' \| 'PASSWORD_RESET_COMPLETE'` |
| `client/src/contexts/AuthContext.tsx` | Login via Express API; idle timeout integration |
| `client/src/services/auth.service.ts` | New forgot/reset functions, login via API |
| `client/src/services/api.ts` | Send kiosk JWT as Bearer; remove raw header logic |
| `client/src/components/auth/LoginPage.tsx` | Add "Forgot password?" link |
| `client/src/App.tsx` | New routes for `/forgot-password`, `/reset-password` |
| `client/src/pages/kiosk/StationLogin.tsx` | Store JWT from PIN auth response |
| `client/src/contexts/KioskContext.tsx` | Update `login()` to accept and store JWT from PIN auth; read from `capsule_kiosk_token` |
| `shared/types/index.ts` | Add `token: string` to `StationAuthResponse`; expand `AuditLogEntry.action` union to include auth event types (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCOUNT_LOCKED`, `LOGOUT`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_COMPLETE`) |
| `server/package.json` | Add `jsonwebtoken` + `@types/jsonwebtoken` dependencies |

---

## Security Properties After Implementation

| Property | Mechanism |
|----------|-----------|
| Passwords securely hashed | Supabase GoTrue (bcrypt) — unchanged |
| Sessions expire | 1hr access token (Supabase), 30min idle timeout (frontend) |
| Password reset tokens expire | 1hr (Supabase default) |
| Login rate limited | 5/min per IP on `/api/auth/login` |
| Account lockout | 10 failures in 15min = 15min lock |
| Kiosk auth cryptographically verified | Signed JWT (8hr expiry) replaces raw headers |
| Password strength enforced | Server-side validation (8+ chars, upper, lower, digit) |
| Auth secrets not exposed to frontend | Service role key server-only; `KIOSK_JWT_SECRET` server-only |
| Auth events audited | Login, logout, failure, lockout, reset logged |
| Dev bypass safe | Production startup guard, loud warning, debug header |
