# IDOR & Authorization Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce role-based access on unprotected endpoints, scope operator access to their station, add notification ownership checks, and prevent self-role-escalation.

**Architecture:** A new `operatorScope` middleware gates operator-role users to a whitelist of station-scoped paths. Missing `requireRole()` calls are added to route files. Notification ownership and self-escalation prevention are controller-level guards. `AuthenticatedUser` is extended with `stationName` and `authType` fields populated from kiosk JWTs.

**Tech Stack:** Express middleware, TypeScript, PostgreSQL queries

**Spec:** `docs/superpowers/specs/2026-03-23-idor-authorization-hardening-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/src/middleware/operatorScope.ts` | Operator whitelist middleware — blocks operator-role users from accessing non-station resources |

### Modified Files
| File | What Changes |
|------|-------------|
| `server/src/middleware/auth.ts` | Extend `AuthenticatedUser` with `stationName?` and `authType?`; populate from kiosk JWT |
| `server/src/controllers/station-kiosks.controller.ts` | Fix operator-PIN JWT: set `stationName` to `null` |
| `server/src/server.ts` | Mount `operatorScope` after `authMiddleware` |
| `server/src/routes/station-kiosks.routes.ts` | Add `requireRole('admin', 'manager')` to POST/PUT/DELETE |
| `server/src/routes/route-templates.routes.ts` | Add `requireRole('admin', 'manager', 'engineer')` to CUD operations |
| `server/src/routes/tracked-parts.routes.ts` | Add `requireRole('admin', 'manager', 'engineer')` to PUT/DELETE |
| `server/src/controllers/notifications.controller.ts` | Add ownership check on markAsRead and deleteNotification |
| `server/src/controllers/profiles.controller.ts` | Add self-role-escalation prevention |

---

## Task 1: Extend AuthenticatedUser & Populate from Kiosk JWT

**Files:**
- Modify: `server/src/middleware/auth.ts:7-12` (AuthenticatedUser interface)
- Modify: `server/src/middleware/auth.ts:84-89` (kiosk JWT req.user assignment)

- [ ] **Step 1: Update KioskJwtPayload stationName to allow null**

In `server/src/middleware/auth.ts`, find (line 26):
```typescript
  stationName: string;
```
(inside the `KioskJwtPayload` interface)

Replace with:
```typescript
  stationName: string | null;
```

This reflects that operator-PIN tokens will have `stationName: null` after Task 2.

- [ ] **Step 2: Add stationName and authType to AuthenticatedUser**

In `server/src/middleware/auth.ts`, find (line 7):
```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'supply_chain' | 'operator';
}
```

Replace with:
```typescript
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'supply_chain' | 'operator';
  stationName?: string;
  authType?: 'station' | 'operator';
}
```

- [ ] **Step 3: Populate stationName and authType from kiosk JWT payload**

In `server/src/middleware/auth.ts`, find (line 84):
```typescript
      req.user = {
        id: payload.userId || `kiosk-${payload.kioskId}`,
        email: '',
        name: payload.userName || payload.stationName,
        role: (payload.role as AuthenticatedUser['role']) || 'operator',
      };
```

Replace with:
```typescript
      req.user = {
        id: payload.userId || `kiosk-${payload.kioskId}`,
        email: '',
        name: payload.userName || payload.stationName,
        role: (payload.role as AuthenticatedUser['role']) || 'operator',
        stationName: payload.authType === 'station' ? payload.stationName : undefined,
        authType: payload.authType,
      };
```

**Note (spec divergence — intentional):** The spec says `stationName: payload.stationName` unconditionally. This plan adds a conditional filter as defense-in-depth: even after Task 2 fixes the JWT source data to `null`, the auth middleware also filters it here. Both changes together ensure `req.user.stationName` is only set for station-PIN tokens.

**Note:** The response body in `authenticateStation` (lines 164-171) intentionally still returns `stationName: profile.name` for the kiosk UI to display the operator's name. Only the JWT payload is changed to `null` — the API response is separate from the token.

- [ ] **Step 4: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat: extend AuthenticatedUser with stationName and authType from kiosk JWT

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fix Operator-PIN JWT stationName

**Files:**
- Modify: `server/src/controllers/station-kiosks.controller.ts:150-162`

- [ ] **Step 1: Set stationName to null in operator-PIN JWT**

In `server/src/controllers/station-kiosks.controller.ts`, find (line 150):
```typescript
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
```

Replace with:
```typescript
        const token = jwt.sign(
          {
            type: 'kiosk',
            kioskId: 0,
            stationName: null,
            userId: profile.id,
            userName: profile.name,
            authType: 'operator',
            role: 'operator',
          },
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/station-kiosks.controller.ts
git commit -m "fix: set stationName to null in operator-PIN JWT (not operator's personal name)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create Operator Scope Middleware

**Files:**
- Create: `server/src/middleware/operatorScope.ts`

- [ ] **Step 1: Create the operator scope middleware**

Create `server/src/middleware/operatorScope.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../models/database';
import { logger } from '../lib/logger';

/**
 * Operator scope middleware — restricts operator-role users to a whitelist
 * of station-scoped paths. Non-operator roles pass through unchanged.
 *
 * Must be mounted AFTER authMiddleware (requires req.user).
 */
export const operatorScope = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Only applies to operator role
  if (!req.user || req.user.role !== 'operator') {
    return next();
  }

  const method = req.method;
  const path = req.path;
  const stationName = req.user.stationName; // Only set for station-PIN tokens

  // --- Whitelist: reference data (no station check needed) ---
  if (method === 'GET' && (
    path === '/api/workflow/stages' ||
    path === '/api/machines' ||
    path.startsWith('/api/machines/')
  )) {
    return next();
  }

  // --- Whitelist: notifications (ownership enforced in controller) ---
  if (path.startsWith('/api/notifications')) {
    return next();
  }

  // --- Whitelist: tracked parts by station ---
  if (method === 'GET' && path.startsWith('/api/tracked-parts/station/')) {
    // Verify the station name matches the operator's station
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const requestedStation = decodeURIComponent(path.split('/api/tracked-parts/station/')[1]);
    if (requestedStation.trim().toLowerCase() !== stationName.trim().toLowerCase()) {
      res.status(403).json({ error: 'Cannot access another station\'s queue' });
      return;
    }
    return next();
  }

  // --- Whitelist: tracked part lookup by tracking ID ---
  if (method === 'GET' && path.startsWith('/api/tracked-parts/lookup/')) {
    return next();
  }

  // --- Whitelist: tracked part by ID (GET, check-in, check-out) — requires station DB check ---
  const trackedPartMatch = path.match(/^\/api\/tracked-parts\/(\d+)(\/check-in|\/check-out)?$/);
  if (trackedPartMatch && (method === 'GET' || method === 'POST')) {
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const partId = trackedPartMatch[1];
    try {
      const part = await queryOne<{ current_station: string | null }>(
        'SELECT current_station FROM tracked_parts WHERE id = $1',
        [partId]
      );
      if (!part) {
        res.status(404).json({ error: 'Tracked part not found' });
        return;
      }
      if (!part.current_station || part.current_station.trim().toLowerCase() !== stationName.trim().toLowerCase()) {
        res.status(403).json({ error: 'This part is not at your station' });
        return;
      }
      return next();
    } catch (error) {
      logger.error('Operator scope DB check failed', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Authorization check failed' });
      return;
    }
  }

  // --- Whitelist: job detail — only if job has parts at operator's station ---
  const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
  if (jobMatch && method === 'GET') {
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const jobId = jobMatch[1];
    try {
      const part = await queryOne<{ id: number }>(
        `SELECT id FROM tracked_parts
         WHERE job_id = $1 AND LOWER(TRIM(current_station)) = LOWER(TRIM($2))
         LIMIT 1`,
        [jobId, stationName]
      );
      if (!part) {
        res.status(403).json({ error: 'No parts from this job are at your station' });
        return;
      }
      return next();
    } catch (error) {
      logger.error('Operator scope job check failed', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Authorization check failed' });
      return;
    }
  }

  // --- Everything else: blocked ---
  res.status(403).json({ error: 'Insufficient permissions for this resource' });
};
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/operatorScope.ts
git commit -m "feat: add operator scope middleware — restricts operators to station-scoped resources

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Mount Operator Scope Middleware in Server

**Files:**
- Modify: `server/src/server.ts`

- [ ] **Step 1: Import and mount operatorScope**

In `server/src/server.ts`, add import after the `authMiddleware` import (around line 23):

```typescript
import { operatorScope } from './middleware/operatorScope';
```

Then find the line `app.use(authMiddleware);` and add immediately AFTER it:

```typescript
app.use(operatorScope);
```

- [ ] **Step 2: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/server.ts
git commit -m "feat: mount operatorScope middleware after authMiddleware

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add Missing requireRole to Route Files

**Files:**
- Modify: `server/src/routes/station-kiosks.routes.ts`
- Modify: `server/src/routes/route-templates.routes.ts`
- Modify: `server/src/routes/tracked-parts.routes.ts`

- [ ] **Step 1: Add requireRole to station kiosks routes**

In `server/src/routes/station-kiosks.routes.ts`, add import:

```typescript
import { requireRole } from '../middleware/roles';
```

Then replace the CUD routes (lines 16, 18, 19):

```typescript
router.post('/', controller.createStationKiosk);
```
becomes:
```typescript
router.post('/', requireRole('admin', 'manager'), controller.createStationKiosk);
```

```typescript
router.put('/:id', controller.updateStationKiosk);
```
becomes:
```typescript
router.put('/:id', requireRole('admin', 'manager'), controller.updateStationKiosk);
```

```typescript
router.delete('/:id', controller.deleteStationKiosk);
```
becomes:
```typescript
router.delete('/:id', requireRole('admin', 'manager'), controller.deleteStationKiosk);
```

Leave `GET /` and `POST /auth` unchanged.

- [ ] **Step 2: Add requireRole to route templates routes**

In `server/src/routes/route-templates.routes.ts`, add import:

```typescript
import { requireRole } from '../middleware/roles';
```

Add `requireRole('admin', 'manager', 'engineer')` to all CUD operations. Leave GET routes unchanged.

Replace lines 8-16:
```typescript
router.post('/', controller.createRouteTemplate);
router.put('/:id', controller.updateRouteTemplate);
router.delete('/:id', controller.deleteRouteTemplate);

// Steps
router.post('/:id/steps', controller.addStep);
router.put('/:id/steps/reorder', controller.reorderSteps);
router.put('/:id/steps/:stepId', controller.updateStep);
router.delete('/:id/steps/:stepId', controller.deleteStep);
```

with:
```typescript
router.post('/', requireRole('admin', 'manager', 'engineer'), controller.createRouteTemplate);
router.put('/:id', requireRole('admin', 'manager', 'engineer'), controller.updateRouteTemplate);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), controller.deleteRouteTemplate);

// Steps
router.post('/:id/steps', requireRole('admin', 'manager', 'engineer'), controller.addStep);
router.put('/:id/steps/reorder', requireRole('admin', 'manager', 'engineer'), controller.reorderSteps);
router.put('/:id/steps/:stepId', requireRole('admin', 'manager', 'engineer'), controller.updateStep);
router.delete('/:id/steps/:stepId', requireRole('admin', 'manager', 'engineer'), controller.deleteStep);
```

- [ ] **Step 3: Add requireRole to tracked parts routes**

In `server/src/routes/tracked-parts.routes.ts`, add import:

```typescript
import { requireRole } from '../middleware/roles';
```

Replace lines 11-12:
```typescript
router.put('/:id', controller.updateTrackedPart);
router.delete('/:id', controller.deleteTrackedPart);
```

with:
```typescript
router.put('/:id', requireRole('admin', 'manager', 'engineer'), controller.updateTrackedPart);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), controller.deleteTrackedPart);
```

Leave check-in/check-out unchanged (operators need these, scoped by operatorScope middleware).

- [ ] **Step 4: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/station-kiosks.routes.ts server/src/routes/route-templates.routes.ts server/src/routes/tracked-parts.routes.ts
git commit -m "feat: add requireRole to station kiosks, route templates, and tracked parts routes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Add Notification Ownership Checks

**Files:**
- Modify: `server/src/controllers/notifications.controller.ts:78-101` (markAsRead)
- Modify: `server/src/controllers/notifications.controller.ts:134-155` (deleteNotification)

- [ ] **Step 1: Add ownership check to markAsRead**

In `server/src/controllers/notifications.controller.ts`, find (line 82):
```typescript
    const notification = await queryOne(
      'SELECT id FROM notifications WHERE id = ?',
      [id]
    );
```

Replace with:
```typescript
    const notification = await queryOne<{ id: number; user_id: string | null }>(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );
```

Then after the `if (!notification)` block (after line 90), add:

```typescript
    // Ownership check — broadcast notifications (user_id IS NULL) can be dismissed by anyone
    if (notification.user_id && notification.user_id !== req.user?.id) {
      res.status(403).json({ error: 'Cannot modify another user\'s notification' });
      return;
    }
```

- [ ] **Step 2: Add ownership check to deleteNotification**

In `server/src/controllers/notifications.controller.ts`, find (line 138):
```typescript
    const notification = await queryOne(
      'SELECT id FROM notifications WHERE id = ?',
      [id]
    );
```

Replace with:
```typescript
    const notification = await queryOne<{ id: number; user_id: string | null }>(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );
```

Then after the `if (!notification)` block (after line 146), add:

```typescript
    // Ownership check — broadcast notifications (user_id IS NULL) can be deleted by anyone
    if (notification.user_id && notification.user_id !== req.user?.id) {
      res.status(403).json({ error: 'Cannot modify another user\'s notification' });
      return;
    }
```

- [ ] **Step 3: Verify build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/notifications.controller.ts
git commit -m "feat: add notification ownership checks on markAsRead and delete

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Add Self-Role-Escalation Prevention

**Files:**
- Modify: `server/src/controllers/profiles.controller.ts:142-170`

- [ ] **Step 1: Add self-role-change guard in updateProfile**

In `server/src/controllers/profiles.controller.ts`, in the `updateProfile` function, after fetching `existing` (line 148-152) and before the `updates` array initialization (line 154), add:

```typescript
    // Prevent self-role-escalation — another admin/manager must change your role
    if (id === req.user?.id && role !== undefined && role !== existing.role) {
      res.status(403).json({ error: 'Cannot change your own role' });
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
git commit -m "feat: prevent self-role-escalation in profile update

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full Build Verification

- [ ] **Step 1: Build server**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Build client**

```bash
cd client && npx tsc --noEmit && npm run build
```
Expected: no errors (client changes are zero — all server-side).

- [ ] **Step 3: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from IDOR hardening"
```

---

## Summary of Security Properties Delivered

| Property | Task |
|----------|------|
| Operators scoped to their station | Tasks 1, 2, 3, 4 |
| Station kiosk CRUD restricted to admin/manager | Task 5 |
| Route template CRUD restricted to admin/manager/engineer | Task 5 |
| Tracked part PUT/DELETE restricted to admin/manager/engineer | Task 5 |
| Notification ownership enforced (all roles) | Task 6 |
| Self-role-escalation prevented | Task 7 |
