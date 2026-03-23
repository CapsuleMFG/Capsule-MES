# IDOR & Authorization Hardening — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Enforce role-based access on unprotected endpoints, scope operator access to their station, add notification ownership checks, prevent self-role-escalation.

---

## Current State

Capsule ERP has global authentication (all API requests require a valid JWT) and role-based access via `requireRole()` middleware on most write endpoints. However, several gaps exist:

### Gaps Identified

| # | Issue | Severity |
|---|-------|----------|
| 1 | Operators can access all API endpoints (jobs, inventory, clients, scheduling, etc.) despite only needing station-scoped data | HIGH |
| 2 | Station kiosk CRUD has no role restriction — any authenticated user can create/edit/delete kiosks | HIGH |
| 3 | Route template CRUD has no role restriction | MEDIUM |
| 4 | Tracked parts PUT/DELETE have no role restriction | MEDIUM |
| 5 | Notification read/delete endpoints don't verify the notification belongs to `req.user` — any user can dismiss another user's notifications | MEDIUM |
| 6 | Profile update allows self-role-escalation — an admin/manager editing their own profile can change their role | LOW |

---

## Access Model

### Three authorization tiers:

**1. Full-access roles** (admin, manager, engineer, supply_chain)
- Can read all shared data (jobs, BOMs, inventory, clients, etc.)
- Write permissions governed by existing `requireRole()` checks per endpoint
- No ownership-based filtering — all users at the company work on the same data

**2. Operator role** — Scoped to their station
- Can only read tracked parts queued/checked-in at their station
- Can read job details (name, description, status) for jobs those parts belong to
- Can check-in/check-out parts at their station
- Can read/manage their own notifications
- Cannot access: clients, inventory, procurement, scheduling, reports, suppliers, BOM, route templates, station kiosk management, audit logs, engineering, supply chain, purchase orders, downtime, shipping, production dashboard

**3. Notification ownership** (all roles)
- Users can only read/dismiss their own notifications
- `PUT /notifications/:id/read` and `DELETE /notifications/:id` must verify `notification.user_id === req.user.id`

---

## Design

### 1. Operator Scope Middleware

A new middleware `operatorScope` that runs globally after `authMiddleware`. For non-operator roles, it's a no-op pass-through (zero performance cost). For operators, it enforces a whitelist of allowed paths.

**Allowed paths for operators:**

| Path Pattern | Condition |
|---|---|
| `GET /api/tracked-parts/station/:stationName` | `:stationName` must match operator's JWT `stationName` (case-insensitive, trimmed) |
| `GET /api/tracked-parts/lookup/:trackingId` | Allow — part lookup is needed at kiosk |
| `GET /api/tracked-parts/:id` | DB check: part must be at operator's station |
| `POST /api/tracked-parts/:id/check-in` | DB check: part must be at operator's station |
| `POST /api/tracked-parts/:id/check-out` | DB check: part must be at operator's station |
| `GET /api/jobs/:id` | DB check: job must have at least one tracked part at operator's station |
| `GET /api/notifications` | Pass through — controller already filters by user_id |
| `GET /api/notifications/unread-count` | Pass through — controller already filters by user_id |
| `PUT /api/notifications/:id/read` | Pass through — ownership checked in controller |
| `DELETE /api/notifications/:id` | Pass through — ownership checked in controller |
| `GET /api/workflow/stages` | Allow — reference data needed by kiosk UI |
| `GET /api/machines` | Allow — reference data for machine selection in kiosk |
| `GET /api/machines/:id` | Allow — reference data |

All other paths return: `403 { error: "Insufficient permissions for this resource" }`

**Station identity extraction:**
- For kiosk JWT tokens (where `decoded.type === 'kiosk'`), the station name is in `decoded.stationName`
- The middleware reads station context from `req.user.name` (set by auth middleware from the kiosk JWT payload)
- For station-scoped DB checks, query `tracked_parts` where `current_station` matches the operator's station name

**Implementation details:**
- The middleware uses path pattern matching (not regex on every request — a simple prefix check + split)
- DB checks only run for paths that need them (`:id` lookups). Whitelist paths without `:id` params pass without DB queries.
- If `KIOSK_JWT_SECRET` is not configured, operators cannot authenticate at all (handled by auth middleware), so the scope middleware never runs for unauthenticated kiosk users

### 2. Missing Role Restrictions

Add `requireRole()` to endpoints currently missing it:

| Route File | Endpoints | Roles |
|---|---|---|
| `station-kiosks.routes.ts` | `POST /`, `PUT /:id`, `DELETE /:id` | admin, manager |
| `route-templates.routes.ts` | `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/steps`, `PUT /:id/steps/reorder`, `PUT /:id/steps/:stepId`, `DELETE /:id/steps/:stepId` | admin, manager, engineer |
| `tracked-parts.routes.ts` | `PUT /:id`, `DELETE /:id` | admin, manager, engineer |

Note: `GET` endpoints for route templates, tracked parts, and station kiosks remain open to all authenticated non-operator users (read access is appropriate for the shared ERP model). Operator access to these is blocked by the operator scope middleware.

Note: `POST /tracked-parts/:id/check-in` and `POST /tracked-parts/:id/check-out` remain open — operators need these at their station, and the operator scope middleware validates station ownership.

### 3. Notification Ownership Check

In the notifications controller, for `PUT /:id/read` and `DELETE /:id`:

1. Fetch the notification by ID
2. Compare `notification.user_id` with `req.user.id`
3. If mismatch, return `403 { error: "Cannot modify another user's notification" }`

This applies to ALL roles, not just operators. An admin should not be able to dismiss a manager's notifications.

### 4. Self-Role-Escalation Prevention

In `PUT /api/profiles/:id` (profiles controller `updateProfile`):

- If `req.params.id === req.user.id` and `req.body.role` is present and differs from the user's current role, return `403 { error: "Cannot change your own role" }`
- This prevents an admin from escalating themselves or changing their own role through the API
- Another admin/manager must change a user's role

---

## File Changes

### New files

| File | Purpose |
|------|---------|
| `server/src/middleware/operatorScope.ts` | Operator whitelist middleware with station-scoped path checks |

### Modified files

| File | Change |
|------|--------|
| `server/src/server.ts` | Mount `operatorScope` middleware after `authMiddleware` |
| `server/src/routes/station-kiosks.routes.ts` | Add `requireRole('admin', 'manager')` to POST/PUT/DELETE |
| `server/src/routes/route-templates.routes.ts` | Add `requireRole('admin', 'manager', 'engineer')` to CUD operations |
| `server/src/routes/tracked-parts.routes.ts` | Add `requireRole('admin', 'manager', 'engineer')` to PUT/DELETE |
| `server/src/controllers/notifications.controller.ts` | Add ownership verification on PUT /:id/read and DELETE /:id |
| `server/src/controllers/profiles.controller.ts` | Add self-role-escalation prevention in updateProfile |

### No migration needed

All changes are middleware and controller logic. No database schema changes required.

---

## Security Properties After Implementation

| Property | Mechanism |
|----------|-----------|
| Operators scoped to their station | `operatorScope` middleware with path whitelist + DB checks |
| Station kiosk management restricted | `requireRole('admin', 'manager')` on CUD endpoints |
| Route template management restricted | `requireRole('admin', 'manager', 'engineer')` on CUD endpoints |
| Tracked part mutation restricted | `requireRole('admin', 'manager', 'engineer')` on PUT/DELETE |
| Notification ownership enforced | Controller-level `user_id` check on read/delete |
| Self-role-escalation prevented | Controller-level guard in profile update |
| Full-access roles unchanged | No impact on admin/manager/engineer/supply_chain workflows |
