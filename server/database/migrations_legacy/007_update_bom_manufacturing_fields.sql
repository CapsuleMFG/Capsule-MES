-- Migration 007: Update BOM to manufacturing-specific fields
-- Replace purchasing fields (unit_cost, supplier_name, lead_time_days) with manufacturing fields (material, thickness, surface_area, powdercoat)

-- Drop temp table if it exists from previous failed attempt
DROP TABLE IF EXISTS bom_items_new;

-- Create new table with manufacturing fields
CREATE TABLE bom_items_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    part_number TEXT NOT NULL,
    description TEXT,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'EA',
    material TEXT,
    thickness TEXT,
    surface_area REAL,
    powdercoat TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Copy existing data (unit_cost, supplier_name, lead_time_days will be dropped)
INSERT INTO bom_items_new (id, job_id, part_number, description, quantity, unit, notes, created_at, updated_at)
SELECT id, job_id, part_number, description, quantity, unit, notes, created_at, updated_at
FROM bom_items;

-- Drop old table
DROP TABLE bom_items;

-- Rename new table
ALTER TABLE bom_items_new RENAME TO bom_items;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_bom_items_job_id ON bom_items(job_id);
