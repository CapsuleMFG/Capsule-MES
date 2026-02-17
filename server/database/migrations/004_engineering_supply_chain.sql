-- Migration 004: Engineering and Supply Chain Management
-- Adds tables for work orders, BOMs, suppliers, inventory, procurement, and engineering tracking

-- ============================================================================
-- SUPPLIERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_suppliers_name ON suppliers(name);

-- ============================================================================
-- WORK ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  wo_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Released', 'Archived')),
  description TEXT,
  created_by TEXT,
  released_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_work_orders_job_id ON work_orders(job_id);
CREATE INDEX idx_work_orders_wo_number ON work_orders(wo_number);
CREATE INDEX idx_work_orders_status ON work_orders(status);

-- ============================================================================
-- BOM ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bom_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL,
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
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_bom_items_work_order_id ON bom_items(work_order_id);
CREATE INDEX idx_bom_items_part_number ON bom_items(part_number);

-- ============================================================================
-- GLOBAL INVENTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS global_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT NOT NULL UNIQUE,
  description TEXT,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'EA',
  reorder_level REAL,
  reorder_quantity REAL,
  unit_cost REAL,
  supplier_name TEXT,
  last_restock_date TEXT,
  warehouse_location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_global_inventory_part_number ON global_inventory(part_number);
CREATE INDEX idx_global_inventory_supplier_name ON global_inventory(supplier_name);

-- ============================================================================
-- JOB PROCUREMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_procurement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  bom_item_id INTEGER,
  global_inventory_id INTEGER,
  quantity_needed REAL NOT NULL,
  quantity_allocated REAL NOT NULL DEFAULT 0,
  quantity_received REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Ordered', 'Partial', 'Received')),
  po_number TEXT,
  supplier_name TEXT,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  cost REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (bom_item_id) REFERENCES bom_items(id) ON DELETE SET NULL,
  FOREIGN KEY (global_inventory_id) REFERENCES global_inventory(id) ON DELETE SET NULL
);

CREATE INDEX idx_job_procurement_job_id ON job_procurement(job_id);
CREATE INDEX idx_job_procurement_bom_item_id ON job_procurement(bom_item_id);
CREATE INDEX idx_job_procurement_global_inventory_id ON job_procurement(global_inventory_id);
CREATE INDEX idx_job_procurement_status ON job_procurement(status);

-- ============================================================================
-- JOB ENGINEERING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_engineering (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started', 'In Progress', 'Completed')),
  assignee TEXT,
  started_at TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_engineering_job_id ON job_engineering(job_id);
CREATE INDEX idx_job_engineering_status ON job_engineering(status);
CREATE INDEX idx_job_engineering_assignee ON job_engineering(assignee);

-- ============================================================================
-- SEED DATA: Sample Suppliers
-- ============================================================================
INSERT OR IGNORE INTO suppliers (name, contact_name, email, phone, payment_terms, lead_time_days)
VALUES
  ('McMaster-Carr', 'Sales Team', 'sales@mcmaster.com', '1-800-555-0100', 'Net 30', 2),
  ('Grainger', 'Account Manager', 'orders@grainger.com', '1-800-555-0200', 'Net 30', 3),
  ('MSC Industrial', 'Customer Service', 'service@mscdirect.com', '1-800-555-0300', 'Net 45', 5),
  ('Fastenal', 'Local Branch', 'branch@fastenal.com', '1-800-555-0400', 'Net 30', 2),
  ('Local Steel Supply', 'John Smith', 'john@localsteel.com', '555-0500', 'Net 15', 7);
