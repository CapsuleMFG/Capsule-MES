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
