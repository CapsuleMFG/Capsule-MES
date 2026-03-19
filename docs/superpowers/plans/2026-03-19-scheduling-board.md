# Scheduling Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a drag-and-drop scheduling board where the production manager can reorder job steps across 13 machines, with kiosk integration for operators.

**Architecture:** New `schedule_entries` table stores per-machine-step cards with position ordering. Backend CRUD with position rebalancing. Frontend uses `@dnd-kit` for drag-and-drop across machine columns. Kiosk station dashboard gets a queue view showing the boss's ordering. Auto-generation hooks into the existing workflow stage transition.

**Tech Stack:** React 18, TypeScript, TailwindCSS, `@dnd-kit/core` + `@dnd-kit/sortable`, Express, PostgreSQL (Supabase), React Query

**Spec:** `docs/superpowers/specs/2026-03-19-scheduling-board-design.md`

> **Note on TDD:** This plan skips unit tests in favor of build verification and manual smoke testing due to the 2-week deadline. Tests can be added post-launch.

---

## Key Codebase References

- `server/src/models/database.ts` — `query()`, `queryOne()`, `execute()`, `executeTransaction()` helpers. Uses `?` placeholders auto-converted to `$1, $2...`.
- `server/src/controllers/jobs.controller.ts:460-506` — `updateWorkflowStage()` function where schedule generation trigger goes.
- `tracked_parts` table — has `job_id`, `route_template_id`, `current_step_id`, `status`.
- `route_template_steps` table — has `machine_id` (nullable), `station_name`, `step_order`.
- `client/src/pages/kiosk/StationDashboard.tsx` — existing kiosk station dashboard (687 lines).
- `client/src/contexts/KioskContext.tsx` — stores `machineId`, `machineName`, `stationName` in sessionStorage.
- Design system: light theme — `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02]` for cards, `bg-gray-100` page bg.

---

## File Map

### Created

| File | Responsibility |
|------|---------------|
| `server/database/migrations/031_schedule_entries.sql` | schedule_entries table, indexes, partial unique index |
| `server/src/controllers/scheduling.controller.ts` | All scheduling CRUD: list, reorder, move, status update, generate |
| `server/src/routes/scheduling.routes.ts` | Route definitions for /api/scheduling |
| `client/src/services/scheduling.service.ts` | API calls for scheduling endpoints |
| `client/src/hooks/useScheduling.ts` | React Query hooks for scheduling data |
| `client/src/pages/SchedulingBoard.tsx` | Main scheduling board page |
| `client/src/components/scheduling/FilterTabs.tsx` | Machine type filter tabs |
| `client/src/components/scheduling/MachineColumn.tsx` | Single machine swim lane column |
| `client/src/components/scheduling/ScheduleCard.tsx` | Draggable job step card |
| `client/src/components/kiosk/KioskQueue.tsx` | Operator queue view for kiosk |
| `client/src/components/kiosk/KioskFlagModal.tsx` | Issue flagging modal for operators |

**Deferred from this plan (add post-launch):**
- `client/src/components/scheduling/ScheduleCardDetail.tsx` — Expandable detail panel on card click. Cards have `onClick` wired but the detail view can be added after core drag-and-drop works.

### Modified

| File | Change |
|------|--------|
| `server/src/models/database.ts` | Add `executeTransactionWithParams` helper |
| `server/src/server.ts` | Mount scheduling routes |
| `server/src/controllers/jobs.controller.ts` | Add schedule generation trigger in updateWorkflowStage |
| `shared/types/index.ts` | Add ScheduleEntry, ScheduleEntryWithJob types |
| `client/src/types/index.ts` | Re-export (already re-exports shared) |
| `client/src/App.tsx` | Add /scheduling route |
| `client/src/components/layout/AppLayout.tsx` | Add Scheduling Board nav item |
| `client/src/pages/kiosk/StationDashboard.tsx` | Integrate KioskQueue component |

---

## Task 1: Database Migration

**Files:**
- Create: `server/database/migrations/031_schedule_entries.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Schedule entries: one card per route step per job on the scheduling board
-- Generated automatically when a job's Production stage starts

CREATE TABLE IF NOT EXISTS schedule_entries (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES machines(id),
  route_step_id INTEGER REFERENCES route_template_steps(id) ON DELETE SET NULL,
  step_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'In Progress', 'Completed', 'Blocked')),
  blocked_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_machine_status ON schedule_entries(machine_id, status, position);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_job ON schedule_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_status ON schedule_entries(status);

-- Partial unique index: no two active entries share same position on same machine
-- Excludes Completed rows so position values can be reused
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_entries_machine_position_active
  ON schedule_entries (machine_id, position)
  WHERE status IN ('Queued', 'In Progress', 'Blocked');
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `apply_migration` with name `031_schedule_entries` and the SQL above.

- [ ] **Step 3: Verify table exists**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'schedule_entries' ORDER BY ordinal_position;
```

Expected: 12 columns returned.

- [ ] **Step 4: Commit**

```bash
git add server/database/migrations/031_schedule_entries.sql
git commit -m "feat: add schedule_entries migration"
```

---

## Task 2: Shared Types

**Files:**
- Modify: `shared/types/index.ts`

- [ ] **Step 1: Add scheduling types**

Append after the REPORTS section (end of file):

```typescript
// ============================================================
// SCHEDULING
// ============================================================

export type ScheduleEntryStatus = 'Queued' | 'In Progress' | 'Completed' | 'Blocked';

export interface ScheduleEntry {
  id: number;
  jobId: number;
  machineId: number;
  routeStepId: number | null;
  stepName: string;
  position: number;
  status: ScheduleEntryStatus;
  blockedReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEntryWithJob extends ScheduleEntry {
  jobNumber: string;
  jobDescription: string;
  clientName: string;
  priority: string;
  targetEndDate: string | null;
  // All route steps for this job (for progress bar)
  routeSteps: {
    id: number;
    stepName: string;
    stepOrder: number;
    status: ScheduleEntryStatus;
    machineId: number;
  }[];
}

export interface MachineQueue {
  machineId: number;
  machineName: string;
  machineType: string;
  entries: ScheduleEntryWithJob[];
}

export interface UpdatePositionRequest {
  position: number;
}

export interface MoveEntryRequest {
  machineId: number;
  position: number;
}

export interface UpdateScheduleStatusRequest {
  status: ScheduleEntryStatus;
  blockedReason?: string;
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add shared/types/index.ts
git commit -m "feat: add scheduling types"
```

---

## Task 3: Scheduling Controller & Routes

**Files:**
- Modify: `server/src/models/database.ts`
- Create: `server/src/controllers/scheduling.controller.ts`
- Create: `server/src/routes/scheduling.routes.ts`
- Modify: `server/src/server.ts`

- [ ] **Step 0: Add executeTransactionWithParams helper**

The existing `executeTransaction()` only accepts `string[]` with no parameter binding. Add a new helper to `server/src/models/database.ts` after the existing `executeTransaction` function:

```typescript
/**
 * Execute multiple parameterized SQL statements in a transaction
 */
export async function executeTransactionWithParams(
    statements: Array<{ sql: string; params: any[] }>
): Promise<void> {
    const client: PoolClient = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const { sql, params } of statements) {
            const converted = convertPlaceholders(sql);
            await client.query(converted, params);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
    } finally {
        client.release();
    }
}
```

You will also need to add `PoolClient` to the import at the top of database.ts if not already imported. Check the existing import — it likely already has it since `executeTransaction` uses it.

- [ ] **Step 1: Create scheduling controller**

Create `server/src/controllers/scheduling.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { query, queryOne, execute, executeTransactionWithParams } from '../models/database';

interface ScheduleRow {
  id: number;
  job_id: number;
  machine_id: number;
  route_step_id: number | null;
  step_name: string;
  position: number;
  status: string;
  blocked_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  job_number: string;
  job_description: string;
  client_name: string;
  priority: string;
  target_end_date: string | null;
  machine_name: string;
  machine_type: string;
}

function mapEntry(row: ScheduleRow) {
  return {
    id: row.id,
    jobId: row.job_id,
    machineId: row.machine_id,
    routeStepId: row.route_step_id,
    stepName: row.step_name,
    position: row.position,
    status: row.status,
    blockedReason: row.blocked_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    jobNumber: row.job_number,
    jobDescription: row.job_description,
    clientName: row.client_name,
    priority: row.priority,
    targetEndDate: row.target_end_date,
  };
}

// GET /api/scheduling — all active entries grouped by machine
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<ScheduleRow>(
      `SELECT se.*, j.job_number, j.description as job_description,
              c.name as client_name, j.priority, j.target_end_date,
              m.name as machine_name, m.type as machine_type
       FROM schedule_entries se
       JOIN jobs j ON j.id = se.job_id
       LEFT JOIN clients c ON c.id = j.client_id
       JOIN machines m ON m.id = se.machine_id
       WHERE se.status IN ('Queued', 'In Progress', 'Blocked')
       ORDER BY se.machine_id, se.position`
    );

    // Get all route steps for jobs on the board (for progress bars)
    const jobIds = [...new Set(rows.map(r => r.job_id))];
    let routeStepsMap: Record<number, Array<{ id: number; stepName: string; stepOrder: number; status: string; machineId: number }>> = {};

    if (jobIds.length > 0) {
      const allSteps = await query<{
        job_id: number; id: number; step_name: string; position: number;
        status: string; machine_id: number; step_order: number;
      }>(
        `SELECT se.job_id, se.id, se.step_name, se.position, se.status, se.machine_id,
                COALESCE(rts.step_order, se.position) as step_order
         FROM schedule_entries se
         LEFT JOIN route_template_steps rts ON rts.id = se.route_step_id
         WHERE se.job_id = ANY($1)
         ORDER BY step_order`,
        [jobIds]
      );

      for (const step of allSteps) {
        if (!routeStepsMap[step.job_id]) routeStepsMap[step.job_id] = [];
        routeStepsMap[step.job_id].push({
          id: step.id,
          stepName: step.step_name,
          stepOrder: step.step_order,
          status: step.status,
          machineId: step.machine_id,
        });
      }
    }

    // Group by machine
    const machines = await query<{ id: number; name: string; type: string }>(
      'SELECT id, name, type FROM machines WHERE active = true ORDER BY display_order, name'
    );

    const result = machines.map(m => ({
      machineId: m.id,
      machineName: m.name,
      machineType: m.type,
      entries: rows
        .filter(r => r.machine_id === m.id)
        .map(r => ({
          ...mapEntry(r),
          routeSteps: routeStepsMap[r.job_id] || [],
        })),
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

// PUT /api/scheduling/:id/position — reorder within machine
export const updatePosition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    const entry = await queryOne<{ machine_id: number; position: number }>(
      'SELECT machine_id, position FROM schedule_entries WHERE id = ? AND status != ?',
      [id, 'Completed']
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    const oldPos = entry.position;
    const newPos = position;

    if (oldPos === newPos) { res.json({ message: 'No change' }); return; }

    // Rebalance positions in a transaction
    if (newPos < oldPos) {
      // Moving up: shift entries between newPos and oldPos-1 down by 1
      await executeTransactionWithParams([
        { sql: 'UPDATE schedule_entries SET position = position + 1, updated_at = NOW() WHERE machine_id = ? AND position >= ? AND position < ? AND status != ?', params: [entry.machine_id, newPos, oldPos, 'Completed'] },
        { sql: 'UPDATE schedule_entries SET position = ?, updated_at = NOW() WHERE id = ?', params: [newPos, id] },
      ]);
    } else {
      // Moving down: shift entries between oldPos+1 and newPos up by 1
      await executeTransactionWithParams([
        { sql: 'UPDATE schedule_entries SET position = position - 1, updated_at = NOW() WHERE machine_id = ? AND position > ? AND position <= ? AND status != ?', params: [entry.machine_id, oldPos, newPos, 'Completed'] },
        { sql: 'UPDATE schedule_entries SET position = ?, updated_at = NOW() WHERE id = ?', params: [newPos, id] },
      ]);
    }

    res.json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
};

// PUT /api/scheduling/:id/move — move to different machine
export const moveEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { machineId, position } = req.body;

    const entry = await queryOne<{ machine_id: number; position: number }>(
      'SELECT machine_id, position FROM schedule_entries WHERE id = ? AND status != ?',
      [id, 'Completed']
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    // Validate same machine type
    const oldMachine = await queryOne<{ type: string }>('SELECT type FROM machines WHERE id = ?', [entry.machine_id]);
    const newMachine = await queryOne<{ type: string }>('SELECT type FROM machines WHERE id = ?', [machineId]);
    if (!oldMachine || !newMachine) { res.status(404).json({ error: 'Machine not found' }); return; }
    if (oldMachine.type !== newMachine.type) {
      res.status(400).json({ error: 'Can only move between machines of the same type' });
      return;
    }

    await executeTransactionWithParams([
      // Close gap on old machine
      { sql: 'UPDATE schedule_entries SET position = position - 1, updated_at = NOW() WHERE machine_id = ? AND position > ? AND status != ?', params: [entry.machine_id, entry.position, 'Completed'] },
      // Make room on new machine
      { sql: 'UPDATE schedule_entries SET position = position + 1, updated_at = NOW() WHERE machine_id = ? AND position >= ? AND status != ?', params: [machineId, position, 'Completed'] },
      // Move the entry
      { sql: 'UPDATE schedule_entries SET machine_id = ?, position = ?, updated_at = NOW() WHERE id = ?', params: [machineId, position, id] },
    ]);

    res.json({ message: 'Entry moved' });
  } catch (error) {
    console.error('Error moving entry:', error);
    res.status(500).json({ error: 'Failed to move entry' });
  }
};

// PUT /api/scheduling/:id/status — update status (used by kiosk too)
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, blockedReason } = req.body;

    const validStatuses = ['Queued', 'In Progress', 'Completed', 'Blocked'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const entry = await queryOne<{ id: number; job_id: number; route_step_id: number | null; machine_id: number }>(
      'SELECT id, job_id, route_step_id, machine_id FROM schedule_entries WHERE id = ?', [id]
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    // Route dependency: can't start if previous step not done
    if (status === 'In Progress' && entry.route_step_id) {
      const currentStep = await queryOne<{ step_order: number; route_template_id: number }>(
        'SELECT step_order, route_template_id FROM route_template_steps WHERE id = ?', [entry.route_step_id]
      );
      if (currentStep && currentStep.step_order > 1) {
        // Find the previous step's schedule entry for this job, scoped to same route template
        const prevEntry = await queryOne<{ status: string }>(
          `SELECT se.status FROM schedule_entries se
           JOIN route_template_steps rts ON rts.id = se.route_step_id
           WHERE se.job_id = ? AND rts.step_order = ? AND rts.route_template_id = ? AND se.id != ?`,
          [entry.job_id, currentStep.step_order - 1, currentStep.route_template_id, id]
        );
        if (prevEntry && prevEntry.status !== 'Completed') {
          res.status(400).json({ error: 'Previous route step must be completed first' });
          return;
        }
      }
    }

    let sql = 'UPDATE schedule_entries SET status = ?, updated_at = NOW()';
    const params: (string | number | null)[] = [status];

    if (status === 'In Progress') {
      sql += ', started_at = COALESCE(started_at, NOW()), blocked_reason = NULL';
    } else if (status === 'Completed') {
      sql += ', completed_at = NOW(), blocked_reason = NULL';
    } else if (status === 'Blocked') {
      sql += ', blocked_reason = ?';
      params.push(blockedReason || null);
    } else if (status === 'Queued') {
      sql += ', blocked_reason = NULL';
    }

    params.push(id);
    sql += ` WHERE id = ?`;
    await execute(sql, params);

    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// POST /api/scheduling/generate/:jobId — auto-generate from route templates
export const generateScheduleEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    await generateEntriesForJob(jobId);
    res.json({ message: 'Schedule entries generated' });
  } catch (error) {
    console.error('Error generating schedule entries:', error);
    res.status(500).json({ error: 'Failed to generate schedule entries' });
  }
};

// Exported for use in jobs.controller.ts trigger
export async function generateEntriesForJob(jobId: number): Promise<void> {
  // Idempotent: skip if entries already exist
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM schedule_entries WHERE job_id = ?', [jobId]
  );
  if (parseInt(existing?.count || '0') > 0) return;

  // Get all tracked parts for this job that have route templates
  const trackedParts = await query<{ id: number; route_template_id: number }>(
    'SELECT id, route_template_id FROM tracked_parts WHERE job_id = ? AND route_template_id IS NOT NULL',
    [jobId]
  );

  if (trackedParts.length === 0) return;

  // Collect unique route template IDs
  const templateIds = [...new Set(trackedParts.map(tp => tp.route_template_id))];

  for (const templateId of templateIds) {
    const steps = await query<{
      id: number; station_name: string; machine_id: number | null; step_order: number;
    }>(
      'SELECT id, station_name, machine_id, step_order FROM route_template_steps WHERE route_template_id = ? ORDER BY step_order',
      [templateId]
    );

    for (const step of steps) {
      if (!step.machine_id) {
        console.warn(`Skipping step "${step.station_name}" — no machine assigned`);
        continue;
      }

      // Get next position for this machine
      const maxPos = await queryOne<{ max_pos: string }>(
        `SELECT COALESCE(MAX(position), 0)::text as max_pos FROM schedule_entries
         WHERE machine_id = ? AND status IN ('Queued', 'In Progress', 'Blocked')`,
        [step.machine_id]
      );

      await execute(
        `INSERT INTO schedule_entries (job_id, machine_id, route_step_id, step_name, position, status)
         VALUES (?, ?, ?, ?, ?, 'Queued')`,
        [jobId, step.machine_id, step.id, step.station_name, parseInt(maxPos?.max_pos || '0') + 1]
      );
    }
  }
}

// GET /api/scheduling/blocked-count — for nav badge
export const getBlockedCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM schedule_entries WHERE status = 'Blocked'`
    );
    res.json({ count: parseInt(result?.count || '0') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked count' });
  }
};
```

- [ ] **Step 2: Create scheduling routes**

Create `server/src/routes/scheduling.routes.ts`:

```typescript
import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getSchedule,
  updatePosition,
  moveEntry,
  updateStatus,
  generateScheduleEntries,
  getBlockedCount,
} from '../controllers/scheduling.controller';

const router = Router();

router.get('/', requireRole('admin', 'manager'), getSchedule);
router.get('/blocked-count', getBlockedCount);
router.put('/:id/position', requireRole('admin', 'manager'), updatePosition);
router.put('/:id/move', requireRole('admin', 'manager'), moveEntry);
router.put('/:id/status', updateStatus); // All roles — kiosk uses this
router.post('/generate/:jobId', requireRole('admin', 'manager'), generateScheduleEntries);

export default router;
```

- [ ] **Step 3: Mount routes in server.ts**

In `server/src/server.ts`, add import:

```typescript
import schedulingRouter from './routes/scheduling.routes';
```

Add route mount after existing routes:

```typescript
app.use('/api/scheduling', schedulingRouter);
```

- [ ] **Step 4: Add schedule generation trigger in jobs.controller.ts**

In `server/src/controllers/jobs.controller.ts`, add import at top:

```typescript
import { generateEntriesForJob } from './scheduling.controller';
```

Inside `updateWorkflowStage` function (around line 490, after the `execute()` call that updates the stage), add:

```typescript
    // Auto-generate schedule entries when Production starts
    if (status === 'In Progress') {
      const stage = await queryOne<{ name: string }>(
        'SELECT ws.name FROM workflow_stages ws JOIN job_workflow_progress jwp ON jwp.stage_id = ws.id WHERE jwp.id = ?',
        [stageId]
      );
      if (stage?.name === 'Production') {
        await generateEntriesForJob(parseInt(jobId));
      }
    }
```

- [ ] **Step 5: Verify server builds**

```bash
cd server && npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/scheduling.controller.ts server/src/routes/scheduling.routes.ts server/src/server.ts server/src/controllers/jobs.controller.ts
git commit -m "feat: add scheduling controller, routes, and auto-generation trigger"
```

---

## Task 4: Frontend Service & Hooks

**Files:**
- Create: `client/src/services/scheduling.service.ts`
- Create: `client/src/hooks/useScheduling.ts`

- [ ] **Step 1: Create scheduling service**

Create `client/src/services/scheduling.service.ts`:

```typescript
import api from './api';
import type {
  MachineQueue,
  UpdatePositionRequest,
  MoveEntryRequest,
  UpdateScheduleStatusRequest,
} from '../types';

export async function getSchedule(): Promise<MachineQueue[]> {
  const { data } = await api.get('/scheduling');
  return data;
}

export async function updatePosition(id: number, req: UpdatePositionRequest): Promise<void> {
  await api.put(`/scheduling/${id}/position`, req);
}

export async function moveEntry(id: number, req: MoveEntryRequest): Promise<void> {
  await api.put(`/scheduling/${id}/move`, req);
}

export async function updateScheduleStatus(id: number, req: UpdateScheduleStatusRequest): Promise<void> {
  await api.put(`/scheduling/${id}/status`, req);
}

export async function generateSchedule(jobId: number): Promise<void> {
  await api.post(`/scheduling/generate/${jobId}`);
}

export async function getBlockedCount(): Promise<number> {
  const { data } = await api.get('/scheduling/blocked-count');
  return data.count;
}
```

- [ ] **Step 2: Create scheduling hooks**

Create `client/src/hooks/useScheduling.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as schedulingService from '../services/scheduling.service';
import type { UpdatePositionRequest, MoveEntryRequest, UpdateScheduleStatusRequest } from '../types';

const schedulingKeys = {
  all: ['scheduling'] as const,
  board: () => [...schedulingKeys.all, 'board'] as const,
  blockedCount: () => [...schedulingKeys.all, 'blocked-count'] as const,
};

export function useSchedule(refetchInterval = 15000) {
  return useQuery({
    queryKey: schedulingKeys.board(),
    queryFn: schedulingService.getSchedule,
    refetchInterval,
  });
}

export function useBlockedCount() {
  return useQuery({
    queryKey: schedulingKeys.blockedCount(),
    queryFn: schedulingService.getBlockedCount,
    refetchInterval: 30000,
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & UpdatePositionRequest) =>
      schedulingService.updatePosition(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingKeys.board() }),
  });
}

export function useMoveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & MoveEntryRequest) =>
      schedulingService.moveEntry(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingKeys.board() }),
  });
}

export function useUpdateScheduleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & UpdateScheduleStatusRequest) =>
      schedulingService.updateScheduleStatus(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.board() });
      queryClient.invalidateQueries({ queryKey: schedulingKeys.blockedCount() });
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
git add client/src/services/scheduling.service.ts client/src/hooks/useScheduling.ts shared/types/index.ts
git commit -m "feat: add scheduling service, hooks, and types"
```

---

## Task 5: Filter Tabs Component

**Files:**
- Create: `client/src/components/scheduling/FilterTabs.tsx`

- [ ] **Step 1: Create FilterTabs**

Create `client/src/components/scheduling/FilterTabs.tsx`:

```tsx
interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  blockedCount: number;
}

const TABS = [
  { id: 'All', label: 'All' },
  { id: 'Cutting', label: 'Cutting' },
  { id: 'Forming', label: 'Forming' },
  { id: 'Roll Forming', label: 'Roll Forming' },
  { id: 'CNC', label: 'CNC / Wood' },
  { id: 'Finishing', label: 'Finishing' },
  { id: 'Hardware Insertion', label: 'Hardware' },
  { id: 'Fabrication', label: 'Fabrication' },
];

export default function FilterTabs({ activeTab, onTabChange, blockedCount }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-sm rounded-[10px] whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'bg-gray-900 text-white font-medium'
              : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tab.label}
        </button>
      ))}
      {blockedCount > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-md">
          {blockedCount} blocked
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/scheduling/FilterTabs.tsx
git commit -m "feat: add scheduling filter tabs component"
```

---

## Task 6: Schedule Card Component

**Files:**
- Create: `client/src/components/scheduling/ScheduleCard.tsx`

- [ ] **Step 1: Create ScheduleCard**

Create `client/src/components/scheduling/ScheduleCard.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import type { ScheduleEntryWithJob } from '../../types';

interface ScheduleCardProps {
  entry: ScheduleEntryWithJob;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700',
  High: 'bg-amber-50 text-amber-700',
  Medium: 'bg-gray-100 text-gray-500',
  Low: 'bg-gray-100 text-gray-400',
};

const stepStatusColor: Record<string, string> = {
  Completed: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  Blocked: 'bg-red-500',
  Queued: 'bg-gray-200',
};

export default function ScheduleCard({ entry, onClick }: ScheduleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, data: { entry } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if this step is waiting on a previous step
  const currentStepOrder = entry.routeSteps.find(s => s.id === entry.id)?.stepOrder ?? 0;
  const prevStep = entry.routeSteps.find(s => s.stepOrder === currentStepOrder - 1);
  const isWaiting = prevStep && prevStep.status !== 'Completed';

  // Days until due
  const daysLeft = entry.targetEndDate
    ? Math.ceil((new Date(entry.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm ring-1 ring-black/[0.02] p-3 cursor-pointer
        transition-shadow hover:shadow-md
        ${isWaiting ? 'opacity-50' : ''}
        ${entry.status === 'In Progress' ? 'border-l-4 border-amber-500' : ''}
        ${entry.status === 'Blocked' ? 'border-l-4 border-red-500' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <DotsSixVertical size={16} weight="bold" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">{entry.jobNumber}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${priorityColors[entry.priority] || 'bg-gray-100 text-gray-500'}`}>
              {entry.priority}
            </span>
          </div>

          <p className="text-xs text-gray-500 truncate">{entry.jobDescription}</p>
          <p className="text-[11px] text-gray-400 truncate">{entry.clientName}</p>

          {/* Route progress bar */}
          {entry.routeSteps.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-0.5">
                {entry.routeSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`h-1 flex-1 rounded-full ${stepStatusColor[step.status] || 'bg-gray-200'}`}
                    title={`${step.stepName}: ${step.status}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 truncate">
                {entry.routeSteps.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ' → '}
                    <span className={s.id === entry.id ? 'font-semibold text-gray-600' : ''}>
                      {s.status === 'Completed' ? `${s.stepName}✓` : s.stepName}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Due date + waiting/blocked info */}
          <div className="flex items-center justify-between mt-2">
            {entry.targetEndDate && (
              <span className={`text-[10px] ${daysLeft !== null && daysLeft <= 2 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {daysLeft !== null && daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
              </span>
            )}
            {isWaiting && (
              <span className="text-[10px] text-gray-400">Waiting on {prevStep?.stepName}</span>
            )}
            {entry.status === 'Blocked' && entry.blockedReason && (
              <span className="text-[10px] text-red-600 truncate">{entry.blockedReason}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/scheduling/ScheduleCard.tsx
git commit -m "feat: add draggable schedule card component"
```

---

## Task 7: Machine Column Component

**Files:**
- Create: `client/src/components/scheduling/MachineColumn.tsx`

- [ ] **Step 1: Create MachineColumn**

Create `client/src/components/scheduling/MachineColumn.tsx`:

```tsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ScheduleCard from './ScheduleCard';
import type { MachineQueue } from '../../types';

interface MachineColumnProps {
  queue: MachineQueue;
  onCardClick?: (entryId: number) => void;
}

export default function MachineColumn({ queue, onCardClick }: MachineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `machine-${queue.machineId}` });

  const activeCount = queue.entries.filter(e => e.status === 'In Progress').length;
  const blockedCount = queue.entries.filter(e => e.status === 'Blocked').length;

  const statusDot = blockedCount > 0
    ? 'bg-red-500'
    : activeCount > 0
    ? 'bg-emerald-500'
    : 'bg-gray-300';

  return (
    <div className="flex-shrink-0 w-[260px]">
      {/* Column Header */}
      <div className="bg-white rounded-t-xl px-3 py-2.5 border-b border-gray-100 ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <h3 className="text-sm font-semibold text-gray-900">{queue.machineName}</h3>
          </div>
          <span className="text-[11px] text-gray-400">{queue.entries.length}</span>
        </div>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`
          bg-gray-50/50 rounded-b-xl ring-1 ring-black/[0.02] p-2 space-y-2
          min-h-[200px] max-h-[calc(100vh-240px)] overflow-y-auto
          transition-colors
          ${isOver ? 'bg-blue-50/50 ring-blue-200' : ''}
        `}
      >
        <SortableContext
          items={queue.entries.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {queue.entries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No jobs queued</p>
          ) : (
            queue.entries.map((entry) => (
              <ScheduleCard
                key={entry.id}
                entry={entry}
                onClick={() => onCardClick?.(entry.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/scheduling/MachineColumn.tsx
git commit -m "feat: add machine column component with droppable zone"
```

---

## Task 8: Scheduling Board Page

**Files:**
- Create: `client/src/pages/SchedulingBoard.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create SchedulingBoard page**

Create `client/src/pages/SchedulingBoard.tsx`:

```tsx
import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useSchedule, useBlockedCount, useUpdatePosition, useMoveEntry } from '../hooks/useScheduling';
import FilterTabs from '../components/scheduling/FilterTabs';
import MachineColumn from '../components/scheduling/MachineColumn';
import ScheduleCard from '../components/scheduling/ScheduleCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { ScheduleEntryWithJob, MachineQueue } from '../types';

export default function SchedulingBoard() {
  const [activeTab, setActiveTab] = useState('All');
  const [activeDragEntry, setActiveDragEntry] = useState<ScheduleEntryWithJob | null>(null);

  const { data: queues, isLoading, error } = useSchedule();
  const { data: blockedCount } = useBlockedCount();
  const updatePosition = useUpdatePosition();
  const moveEntry = useMoveEntry();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Filter queues by active tab
  const filteredQueues = queues?.filter((q: MachineQueue) => {
    if (activeTab === 'All') return true;
    return q.machineType === activeTab;
  }) || [];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as ScheduleEntryWithJob;
    if (entry) setActiveDragEntry(entry);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragEntry(null);
    const { active, over } = event;
    if (!over || !queues) return;

    const activeEntry = active.data.current?.entry as ScheduleEntryWithJob;
    if (!activeEntry) return;

    const overId = String(over.id);

    // Dropped on a machine column
    if (overId.startsWith('machine-')) {
      const targetMachineId = parseInt(overId.replace('machine-', ''));
      if (targetMachineId !== activeEntry.machineId) {
        // Moving to a different machine
        const targetQueue = queues.find((q: MachineQueue) => q.machineId === targetMachineId);
        const newPosition = (targetQueue?.entries.length || 0) + 1;
        moveEntry.mutate({ id: activeEntry.id, machineId: targetMachineId, position: newPosition });
      }
      return;
    }

    // Dropped on another card
    const overEntry = over.data.current?.entry as ScheduleEntryWithJob | undefined;
    // Also check if over.data.current has sortable info
    if (!overEntry && !over.data.current?.sortable) return;

    const overMachineId = overEntry?.machineId;
    const activeMachineId = activeEntry.machineId;

    if (overMachineId && overMachineId !== activeMachineId) {
      // Cross-column: move to the position of the card we dropped on
      const overPosition = overEntry?.position || 1;
      moveEntry.mutate({ id: activeEntry.id, machineId: overMachineId, position: overPosition });
    } else {
      // Same column: reorder
      const machineQueue = queues.find((q: MachineQueue) => q.machineId === activeMachineId);
      if (!machineQueue) return;

      const oldIndex = machineQueue.entries.findIndex((e: ScheduleEntryWithJob) => e.id === activeEntry.id);
      const newIndex = machineQueue.entries.findIndex((e: ScheduleEntryWithJob) => e.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newPosition = machineQueue.entries[newIndex].position;
      updatePosition.mutate({ id: activeEntry.id, position: newPosition });
    }
  }, [queues, updatePosition, moveEntry]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-600">Failed to load scheduling board</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <FilterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          blockedCount={blockedCount || 0}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredQueues.map((queue: MachineQueue) => (
            <MachineColumn key={queue.machineId} queue={queue} />
          ))}
        </div>

        <DragOverlay>
          {activeDragEntry && (
            <div className="w-[240px]">
              <ScheduleCard entry={activeDragEntry} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

Read `client/src/App.tsx` first, then add:

Import at top:
```typescript
import SchedulingBoard from './pages/SchedulingBoard';
```

Add route inside the protected layout routes:
```tsx
<Route path="scheduling" element={
  <ProtectedRoute roles={['admin', 'manager']}>
    <SchedulingBoard />
  </ProtectedRoute>
} />
```

- [ ] **Step 3: Add nav item to AppLayout.tsx**

Read `client/src/components/layout/AppLayout.tsx` first, then:

Add `CalendarBlank` to the phosphor icons import.

Add to the `navigation` array after Production:
```typescript
{ name: 'Scheduling', href: '/scheduling', icon: CalendarBlank, roles: ['admin', 'manager'] },
```

- [ ] **Step 4: Verify full build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/SchedulingBoard.tsx client/src/App.tsx client/src/components/layout/AppLayout.tsx
git commit -m "feat: add scheduling board page with drag-and-drop"
```

---

## Task 9: Kiosk Queue View

**Files:**
- Create: `client/src/components/kiosk/KioskQueue.tsx`
- Create: `client/src/components/kiosk/KioskFlagModal.tsx`
- Modify: `client/src/pages/kiosk/StationDashboard.tsx`

- [ ] **Step 1: Create KioskFlagModal**

Create `client/src/components/kiosk/KioskFlagModal.tsx`:

```tsx
import { useState } from 'react';
import Modal from '../ui/Modal';

interface KioskFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  jobNumber: string;
}

const REASONS = [
  'Blocked — Material',
  'Blocked — Machine Issue',
  'Blocked — Quality Hold',
  'Blocked — Other',
];

export default function KioskFlagModal({ isOpen, onClose, onSubmit, jobNumber }: KioskFlagModalProps) {
  const [selected, setSelected] = useState('');
  const [customNote, setCustomNote] = useState('');

  const handleSubmit = () => {
    const reason = selected === 'Blocked — Other' && customNote
      ? `Other: ${customNote}`
      : selected;
    if (reason) {
      onSubmit(reason);
      setSelected('');
      setCustomNote('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Flag Issue — ${jobNumber}`}>
      <div className="space-y-3">
        {REASONS.map((reason) => (
          <button
            key={reason}
            onClick={() => setSelected(reason)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
              selected === reason
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {reason}
          </button>
        ))}

        {selected === 'Blocked — Other' && (
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full px-3 py-2 text-sm rounded-xl"
            rows={3}
          />
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-[10px] flex-1 disabled:opacity-50"
          >
            Flag Issue
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Create KioskQueue**

Create `client/src/components/kiosk/KioskQueue.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as schedulingService from '../../services/scheduling.service';
import KioskFlagModal from './KioskFlagModal';
import type { ScheduleEntryWithJob } from '../../types';

interface KioskQueueProps {
  machineId: number;
  machineName: string;
}

const statusColors: Record<string, string> = {
  Queued: 'bg-gray-100 text-gray-500',
  'In Progress': 'bg-amber-50 text-amber-700',
  Blocked: 'bg-red-50 text-red-700',
};

export default function KioskQueue({ machineId, machineName }: KioskQueueProps) {
  const [flagEntry, setFlagEntry] = useState<ScheduleEntryWithJob | null>(null);
  const queryClient = useQueryClient();

  const { data: queues, isLoading } = useQuery({
    queryKey: ['scheduling', 'board'],
    queryFn: schedulingService.getSchedule,
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, blockedReason }: { id: number; status: string; blockedReason?: string }) =>
      schedulingService.updateScheduleStatus(id, { status: status as any, blockedReason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduling'] }),
  });

  const machineQueue = queues?.find(q => q.machineId === machineId);
  const entries = machineQueue?.entries || [];

  // Determine which entries can be started
  const canStart = (entry: ScheduleEntryWithJob) => {
    if (entry.status !== 'Queued') return false;
    const currentOrder = entry.routeSteps.find(s => s.id === entry.id)?.stepOrder ?? 0;
    const prevStep = entry.routeSteps.find(s => s.stepOrder === currentOrder - 1);
    return !prevStep || prevStep.status === 'Completed';
  };

  const activeEntry = entries.find(e => e.status === 'In Progress');

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading queue...</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Queue — {machineName}
        <span className="text-sm font-normal text-gray-400 ml-2">{entries.length} jobs</span>
      </h3>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No jobs scheduled</p>
          <p className="text-sm mt-1">Check back later or contact your supervisor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const isActive = entry.status === 'In Progress';
            const startable = canStart(entry);
            const isWaiting = !startable && entry.status === 'Queued';

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-4 ${
                  isActive ? 'ring-2 ring-amber-400' : ''
                } ${isWaiting ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-base font-semibold text-gray-900">{entry.jobNumber}</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[entry.status] || 'bg-gray-100 text-gray-500'}`}>
                      {entry.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">#{idx + 1}</span>
                </div>

                <p className="text-sm text-gray-600">{entry.stepName}</p>
                <p className="text-xs text-gray-400 mt-1">{entry.jobDescription} — {entry.clientName}</p>

                {isWaiting && (
                  <p className="text-xs text-gray-400 mt-2">
                    Waiting on previous step to complete
                  </p>
                )}

                {entry.status === 'Blocked' && entry.blockedReason && (
                  <p className="text-xs text-red-600 mt-2">{entry.blockedReason}</p>
                )}

                {/* Action buttons — large for touch */}
                <div className="flex gap-2 mt-3">
                  {entry.status === 'Queued' && startable && (
                    <button
                      onClick={() => updateStatus.mutate({ id: entry.id, status: 'In Progress' })}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                    >
                      Start
                    </button>
                  )}
                  {entry.status === 'In Progress' && (
                    <>
                      <button
                        onClick={() => updateStatus.mutate({ id: entry.id, status: 'Completed' })}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => setFlagEntry(entry)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                      >
                        Flag Issue
                      </button>
                    </>
                  )}
                  {entry.status === 'Blocked' && (
                    <button
                      onClick={() => setFlagEntry(entry)}
                      className="text-xs text-gray-400"
                    >
                      Update Flag
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flagEntry && (
        <KioskFlagModal
          isOpen={!!flagEntry}
          onClose={() => setFlagEntry(null)}
          jobNumber={flagEntry.jobNumber}
          onSubmit={(reason) => {
            updateStatus.mutate({ id: flagEntry.id, status: 'Blocked', blockedReason: reason });
            setFlagEntry(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Integrate KioskQueue into StationDashboard**

Read `client/src/pages/kiosk/StationDashboard.tsx` first.

Add import at top:
```typescript
import KioskQueue from '../../components/kiosk/KioskQueue';
```

Add a tab or section in the station dashboard that shows the KioskQueue component when the kiosk has a machine selected. The simplest integration: add a "Schedule" tab alongside the existing work order view. Use `station?.machineId` and `station?.machineName` as props.

Find the section where the WO list and parts view are rendered. Add a toggle/tab at the top:

```tsx
const [kioskView, setKioskView] = useState<'parts' | 'schedule'>('schedule');
```

Then conditionally render:
```tsx
{kioskView === 'schedule' ? (
  <KioskQueue machineId={station?.machineId!} machineName={station?.machineName || ''} />
) : (
  // existing parts view
)}
```

Add tab buttons in the header area for switching between "Schedule" and "Parts Tracking" views.

- [ ] **Step 4: Verify build**

```bash
cd client && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/kiosk/KioskQueue.tsx client/src/components/kiosk/KioskFlagModal.tsx client/src/pages/kiosk/StationDashboard.tsx
git commit -m "feat: add kiosk queue view with start/complete/flag actions"
```

---

## Task 10: Final Build Verification & Integration

- [ ] **Step 1: Full server build**

```bash
cd server && npm run build
```

Expected: Zero errors.

- [ ] **Step 2: Full client build**

```bash
cd client && npm run build
```

Expected: Zero errors, build succeeds.

- [ ] **Step 3: Smoke test**

Start both servers and verify:
1. `/scheduling` page loads with machine columns
2. Filter tabs work (switch between All, Cutting, Forming, etc.)
3. If you have a job in Production with route templates, cards appear
4. Cards can be dragged to reorder within a column
5. Cards can be dragged between same-type columns (e.g., Brake 1 ↔ Brake 2)
6. Kiosk shows the schedule queue for the selected machine
7. Blocked count badge appears in nav when entries are flagged

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: scheduling board integration fixes"
```

---

## Success Verification Checklist

After all tasks complete, verify:

- [ ] `npm run build` passes in both server and client with zero errors
- [ ] `schedule_entries` table exists in Supabase with correct columns
- [ ] `/api/scheduling` returns machine queues grouped by machine
- [ ] Drag-and-drop reorder works within a column
- [ ] Drag-and-drop move works between same-type machines
- [ ] Blocked entries show red accent and reason text
- [ ] Filter tabs correctly filter machines by type
- [ ] Kiosk queue view shows ordered entries for selected machine
- [ ] Start/Complete buttons update entry status
- [ ] Flag Issue modal sets blocked status with reason
- [ ] Schedule entries auto-generate when Production stage starts
- [ ] Blocked count badge shows in nav sidebar
