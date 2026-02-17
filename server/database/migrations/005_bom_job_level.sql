-- Migration 005: Make BOM items job-level instead of work-order-level
-- BOMs are uploaded before work orders are created

-- Drop temp table if it exists from previous failed attempt
DROP TABLE IF EXISTS bom_items_new;

-- Create new bom_items table with job_id instead of work_order_id
CREATE TABLE bom_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  part_number TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'EA',
  unit_cost REAL,
  lead_time_days INTEGER,
  supplier_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Copy existing data if any (converting work_order_id to job_id)
INSERT INTO bom_items_new (id, job_id, part_number, description, quantity, unit, unit_cost, lead_time_days, supplier_name, notes, created_at, updated_at)
SELECT
  bi.id,
  wo.job_id,
  bi.part_number,
  bi.description,
  bi.quantity,
  bi.unit,
  bi.unit_cost,
  bi.lead_time_days,
  bi.supplier_name,
  bi.notes,
  bi.created_at,
  bi.updated_at
FROM bom_items bi
INNER JOIN work_orders wo ON bi.work_order_id = wo.id;

-- Drop old table
DROP TABLE bom_items;

-- Rename new table
ALTER TABLE bom_items_new RENAME TO bom_items;

-- Create indexes
CREATE INDEX idx_bom_items_job_id ON bom_items(job_id);
CREATE INDEX idx_bom_items_part_number ON bom_items(part_number);

-- Drop temp table if exists
DROP TABLE IF EXISTS bom_imports_new;

-- Update bom_imports table to remove work_order_id
CREATE TABLE bom_imports_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  items_imported INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO bom_imports_new (id, job_id, filename, items_imported, imported_by, created_at)
SELECT id, job_id, filename, items_imported, imported_by, created_at
FROM bom_imports;

-- Drop old table
DROP TABLE IF EXISTS bom_imports;

-- Rename new table
ALTER TABLE bom_imports_new RENAME TO bom_imports;

-- Create index
CREATE INDEX idx_bom_imports_job_id ON bom_imports(job_id);
