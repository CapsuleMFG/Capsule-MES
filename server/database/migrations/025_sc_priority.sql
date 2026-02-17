-- Add supply chain priority column to jobs table
-- Used for drag-and-drop reordering on the Supply Chain page
ALTER TABLE jobs ADD COLUMN sc_priority INTEGER DEFAULT NULL;

-- Index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_jobs_sc_priority ON jobs(sc_priority);
