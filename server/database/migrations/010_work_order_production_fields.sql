-- Migration 010: Add production management fields to work_orders
-- Adds fields for tracking WO flow from Engineering to Production

-- Add new columns to work_orders table
ALTER TABLE work_orders ADD COLUMN machine_type TEXT;
ALTER TABLE work_orders ADD COLUMN production_status TEXT NOT NULL DEFAULT 'Not Sent'
  CHECK(production_status IN ('Not Sent', 'In Pool', 'Assigned', 'In Progress', 'Completed'));
ALTER TABLE work_orders ADD COLUMN assigned_machine_id INTEGER;
ALTER TABLE work_orders ADD COLUMN sent_to_production_at TEXT;
ALTER TABLE work_orders ADD COLUMN assigned_at TEXT;
ALTER TABLE work_orders ADD COLUMN production_started_at TEXT;
ALTER TABLE work_orders ADD COLUMN production_completed_at TEXT;

-- Create foreign key constraint for assigned_machine_id
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_machine ON work_orders(assigned_machine_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_production_status ON work_orders(production_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_machine_type ON work_orders(machine_type);
