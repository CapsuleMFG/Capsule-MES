-- Refactor jobs table: Remove hours tracking, update date fields
-- Remove: estimated_hours, actual_hours
-- Rename: target_date -> target_end_date
-- Add: target_start_date

-- SQLite doesn't support DROP COLUMN or RENAME COLUMN easily
-- So we'll create a new table and copy data over

-- Create new jobs table with updated schema
CREATE TABLE jobs_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('Critical', 'High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'On Hold', 'Completed', 'Cancelled')),
    description TEXT NOT NULL,
    target_start_date DATE,
    target_end_date DATE,
    start_date DATE,
    completed_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO jobs_new (
    id, job_number, client_id, priority, status, description,
    target_start_date, target_end_date, start_date, completed_date,
    notes, created_at, updated_at
)
SELECT
    id, job_number, client_id, priority, status, description,
    start_date as target_start_date,  -- Use start_date as target_start_date
    target_date as target_end_date,   -- Rename target_date to target_end_date
    start_date,
    completed_date,
    notes, created_at, updated_at
FROM jobs;

-- Drop old table
DROP TABLE jobs;

-- Rename new table to jobs
ALTER TABLE jobs_new RENAME TO jobs;

-- Recreate indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_priority ON jobs(priority);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
