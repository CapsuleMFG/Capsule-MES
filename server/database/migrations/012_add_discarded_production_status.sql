-- Add 'Discarded' as a valid production status
-- Since SQLite doesn't support modifying CHECK constraints, we need to recreate the table

-- Create new table with updated constraint
CREATE TABLE work_orders_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    wo_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Released', 'Archived')),
    description TEXT,
    created_by TEXT,
    released_date TEXT,
    notes TEXT,
    machine_type TEXT,
    production_status TEXT NOT NULL DEFAULT 'Not Sent' CHECK(production_status IN ('Not Sent', 'In Pool', 'Assigned', 'In Progress', 'Completed', 'Discarded')),
    production_priority TEXT CHECK(production_priority IN ('Critical', 'High', 'Medium', 'Low')),
    assigned_machine_id INTEGER,
    sent_to_production_at TEXT,
    assigned_at TEXT,
    production_started_at TEXT,
    production_completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_machine_id) REFERENCES machines(id)
);

-- Copy data from old table
INSERT INTO work_orders_new
SELECT id, job_id, wo_number, status, description, created_by, released_date, notes,
       machine_type, production_status, production_priority, assigned_machine_id,
       sent_to_production_at, assigned_at, production_started_at, production_completed_at,
       created_at, updated_at
FROM work_orders;

-- Drop old table
DROP TABLE work_orders;

-- Rename new table
ALTER TABLE work_orders_new RENAME TO work_orders;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_production_status ON work_orders(production_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_machine ON work_orders(assigned_machine_id);
