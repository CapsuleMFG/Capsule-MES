-- Add downtime_category to machines (for current status)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS downtime_category TEXT CHECK (
  downtime_category IS NULL OR downtime_category IN (
    'Mechanical', 'Electrical', 'Material', 'Changeover', 'Planned Maintenance', 'Operator', 'Quality', 'Other'
  )
);

-- Historical downtime events log
CREATE TABLE IF NOT EXISTS machine_downtime_events (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'Mechanical', 'Electrical', 'Material', 'Changeover', 'Planned Maintenance', 'Operator', 'Quality', 'Other'
  )),
  reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes NUMERIC GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60.0
      ELSE NULL
    END
  ) STORED,
  reported_by TEXT,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE machine_downtime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access" ON machine_downtime_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read" ON machine_downtime_events FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_downtime_events_machine ON machine_downtime_events(machine_id);
CREATE INDEX IF NOT EXISTS idx_downtime_events_started ON machine_downtime_events(started_at);
CREATE INDEX IF NOT EXISTS idx_downtime_events_category ON machine_downtime_events(category);
