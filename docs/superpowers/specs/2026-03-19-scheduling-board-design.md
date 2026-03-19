# Capsule MES Scheduling Board — Design Spec

**Date:** 2026-03-19
**Status:** Reviewed
**Scope:** Drag-and-drop scheduling board for production, kiosk queue integration, operator issue flagging

## Summary

Add a drag-and-drop scheduling board where the production manager can visually rearrange job priority across all 13 machines. When a job enters Production stage, its route template auto-generates schedule entries (one per machine step). The manager drags cards to reorder priority within a machine queue or move steps between same-type machines. Operators see the updated queue on their kiosk screens and can flag issues back to the manager.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Swim lane board (Kanban columns) | Most intuitive for "rearrange anything" — boss drags cards around |
| 13 machines | Filter tabs by type + horizontal scroll | Tabs let boss focus on one area; "All" shows everything |
| Card granularity | One card per route step | Boss needs to control priority at each machine independently |
| Card info | Compact + route progress bar | Enough info for scheduling decisions without making cards too tall |
| Jobs appear when | Production stage starts | Keeps board clean — only shows jobs ready to run |
| Kiosk integration | Queue view + operator can flag issues | Two-way communication between floor and manager |
| Cross-machine moves | Same-type only (e.g., Brake 1 ↔ Brake 2) | Prevents illogical assignments; can be relaxed later |

## Machine Groups (Filter Tabs)

| Tab | Machines |
|-----|----------|
| All | All 13 machines |
| Cutting | Laser, Zund |
| Forming | Brake Press 1, Brake Press 2 |
| Roll Forming | Howick 2.5, Howick 3.5, Howick 8 |
| CNC / Wood | Homag, Edge Bander |
| Finishing | PEM, Welding, Paint, Powdercoat (External) |

## Data Model

### New Table: `schedule_entries`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | |
| `job_id` | INTEGER FK → jobs | The job this step belongs to |
| `machine_id` | INTEGER FK → machines | Which machine this step is assigned to |
| `route_step_id` | INTEGER FK → route_template_steps | Links back to route definition |
| `step_name` | TEXT | Display name (e.g., "Laser Cut", "Brake Bend") |
| `position` | INTEGER | Priority order within that machine's queue (1 = top) |
| `status` | TEXT | "Queued" \| "In Progress" \| "Completed" \| "Blocked" |
| `blocked_reason` | TEXT | Null unless status = Blocked |
| `started_at` | TIMESTAMPTZ | When operator started this step |
| `completed_at` | TIMESTAMPTZ | When operator completed this step |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes:**
- `(machine_id, status, position)` — for loading a machine's queue
- `(job_id)` — for loading all steps for a job
- `(status)` — for filtering blocked entries

**Constraints:**
- `status CHECK (status IN ('Queued', 'In Progress', 'Completed', 'Blocked'))`
- Partial unique index (NOT a constraint): `CREATE UNIQUE INDEX ... ON schedule_entries (machine_id, position) WHERE status IN ('Queued', 'In Progress', 'Blocked')` — excludes Completed rows so position values can be reused

### No changes to existing tables

`route_template_steps` already has `machine_id`, `station_name`, `step_order`, and `estimated_minutes`. These are used to auto-generate schedule entries.

**Note:** `route_template_steps.machine_id` is nullable (FK with ON DELETE SET NULL). Steps with null `machine_id` are skipped during schedule generation with a console warning.

## Auto-Generation Logic

Route templates are assigned **per tracked part** (not per job). A single job can have multiple tracked parts, each with its own route template. When a job's Production workflow stage changes to "In Progress":

1. Query all `tracked_parts` for the job that have a `route_template_id`
2. For each tracked part's route template, get its steps (ordered by `step_order`)
3. For each step:
   - **Skip** if `machine_id` is null (log warning: "Skipping step [name] — no machine assigned")
   - Create a `schedule_entry` with:
     - `job_id` from the job
     - `machine_id` from the route template step
     - `route_step_id` from the step
     - `step_name` from `station_name`
     - `position` = MAX(position) + 1 for that machine (bottom of queue)
     - `status` = "Queued"
4. If schedule entries already exist for this job, skip (idempotent — check `SELECT COUNT(*) FROM schedule_entries WHERE job_id = ?`)
5. If the job has no tracked parts with route templates, no entries are generated — job simply doesn't appear on the scheduling board

**Trigger location:** In `server/src/controllers/jobs.controller.ts`, inside the `updateWorkflowStage` function. After the existing status update logic, add a check: if `stageName === 'Production'` and `status === 'In Progress'`, call `generateScheduleEntries(jobId)`. This runs synchronously before the response is sent.

## API Endpoints

### Scheduling Board

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/scheduling` | All active schedule entries grouped by machine, with job details joined. Query params: `?status=Queued,In Progress,Blocked` (default excludes Completed) | admin, manager |
| `PUT` | `/api/scheduling/:id/position` | Reorder within machine queue. Body: `{ position: 3 }` | admin, manager |
| `PUT` | `/api/scheduling/:id/move` | Move to different machine. Body: `{ machineId: 5, position: 1 }`. Validates same machine type. | admin, manager |
| `PUT` | `/api/scheduling/:id/status` | Update status. Body: `{ status: "Blocked", blockedReason: "Waiting on material" }` | all roles (kiosk uses this) |
| `POST` | `/api/scheduling/generate/:jobId` | Auto-generate entries from route template. Idempotent. | internal (called by workflow trigger) |

### Position Rebalancing

When boss drags card to position 3:
1. Set target entry to position 3
2. All entries at position >= 3 on that machine shift down by 1
3. Single transaction to prevent race conditions

When boss moves card to a different machine at position 1:
1. Remove from old machine (close gap in positions)
2. Insert at position 1 on new machine (shift existing down)
3. Update `machine_id`

## Scheduling Board UI

### Page: `/scheduling`

**Header area:**
- Page title: "Scheduling Board"
- Filter tabs: All | Cutting | Forming | Roll Forming | CNC/Wood | Finishing
- Active tab highlighted with dark pill style (matches existing nav pattern)
- Blocked count badge if any entries are blocked

**Board area:**
- Horizontally scrolling container
- One column per machine (filtered by active tab)
- Column width: ~240px minimum
- Column header: machine name, active job count, status dot (green/gray/red)

**Column body:**
- Vertically stacked draggable cards
- Drop zone indicator when dragging
- Empty state: "No jobs queued" in gray text

### Job Step Card

```
┌─────────────────────────┐
│ CAP-2026-001    Critical│  ← job # + priority badge
│ Marriott Lobby Casework │  ← description (truncated)
│ Acme Builders           │  ← client
│ ■■■□□  Laser✓→Brake→PEM │  ← route progress bar + labels
│ Due: Mar 28    2d left  │  ← due date + countdown
└─────────────────────────┘
```

**Card states:**
- Default: white card, normal text
- Waiting (previous step not done): gray background, "Waiting on [step]" label, cannot be started by operator
- In Progress: left border accent (amber)
- Blocked: left border accent (red), blocked reason shown
- Completed: not shown on board (filtered out)

**Card interactions:**
- Drag handle on left side
- Click card to expand detail panel (shows full route, job info, link to job detail page)

### Drag & Drop Library

Use `@dnd-kit` (already installed in client). Specifically:
- `@dnd-kit/core` for DragOverlay
- `@dnd-kit/sortable` for within-column reordering
- Cross-column drop uses `onDragEnd` with collision detection

## Kiosk Integration

### Updated Kiosk Flow

After operator logs in (PIN) and selects their machine:

**Queue View (replaces or augments current station dashboard):**
- Shows ordered list of schedule entries for that machine
- Top = highest priority
- Grayed-out entries are "Waiting on [previous step]"

**Operator Actions:**
- **"Start"** on top available entry → status = "In Progress", `started_at` = now
- **"Complete"** on in-progress entry → status = "Completed", `completed_at` = now, auto-unlocks next route step
- **"Flag Issue"** → picker with options:
  - "Blocked — Material"
  - "Blocked — Machine Issue"
  - "Blocked — Quality Hold"
  - "Blocked — Other" (with text input)
  - Sets status = "Blocked" with `blocked_reason`

**Route Dependency Enforcement:**
- A schedule entry can only be started when all previous steps in that job's route are completed
- The server validates this on the `PUT /status` endpoint — returns 400 if previous step not done

### Boss Alert

- Scheduling board nav item shows badge count of blocked entries
- Blocked cards on the board show red accent + reason text
- Boss can unblock by changing status back to "Queued" (clears blocked_reason)

## What's Deferred

| Feature | Reason |
|---------|--------|
| Time estimates / Gantt view | Requires duration data on every step; adds complexity |
| Cross-type machine moves | Rare edge case; can edit via modal if needed |
| Push notifications | Nice-to-have; blocked alerts on board are sufficient for now |
| Machine capacity / load balancing | Future analytics feature |
| Schedule history / audit trail | Can use existing audit_log infrastructure later |
| Auto-scheduling suggestions | AI/algorithm feature for future |

## File Map

### New Files

**Backend:**
- `server/database/migrations/031_schedule_entries.sql`
- `server/src/controllers/scheduling.controller.ts`
- `server/src/routes/scheduling.routes.ts`

**Frontend:**
- `client/src/pages/SchedulingBoard.tsx`
- `client/src/components/scheduling/MachineColumn.tsx`
- `client/src/components/scheduling/ScheduleCard.tsx`
- `client/src/components/scheduling/ScheduleCardDetail.tsx`
- `client/src/components/scheduling/FilterTabs.tsx`
- `client/src/hooks/useScheduling.ts`
- `client/src/services/scheduling.service.ts`

**Kiosk:**
- `client/src/components/kiosk/KioskQueue.tsx`
- `client/src/components/kiosk/KioskFlagModal.tsx`

### Modified Files

**Backend:**
- `server/src/server.ts` — mount scheduling routes
- `server/src/controllers/jobs.controller.ts` — trigger schedule generation when Production starts

**Frontend:**
- `client/src/App.tsx` — add `/scheduling` route
- `client/src/components/layout/AppLayout.tsx` — add Scheduling nav item
- `client/src/pages/kiosk/StationDashboard.tsx` — integrate KioskQueue
- `client/src/types/index.ts` — add ScheduleEntry types
- `shared/types/index.ts` — add shared scheduling types
