-- Migration 022: Fix global_inventory table
-- Makes part_number optional and removes warehouse_location column

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- 1. Create new table without warehouse_location and with optional part_number
CREATE TABLE IF NOT EXISTS global_inventory_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT,
  description TEXT,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'EA',
  reorder_level REAL,
  reorder_quantity REAL,
  unit_cost REAL,
  supplier_name TEXT,
  last_restock_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Copy data from old table to new table
INSERT INTO global_inventory_new (
  id, part_number, description, quantity_on_hand, unit, 
  reorder_level, reorder_quantity, unit_cost, supplier_name, 
  last_restock_date, notes, created_at, updated_at
)
SELECT 
  id, part_number, description, quantity_on_hand, unit,
  reorder_level, reorder_quantity, unit_cost, supplier_name,
  last_restock_date, notes, created_at, updated_at
FROM global_inventory;

-- 3. Drop old table
DROP TABLE IF EXISTS global_inventory;

-- 4. Rename new table to original name
ALTER TABLE global_inventory_new RENAME TO global_inventory;

-- 5. Recreate indexes
CREATE INDEX idx_global_inventory_part_number ON global_inventory(part_number);
CREATE INDEX idx_global_inventory_supplier_name ON global_inventory(supplier_name);
