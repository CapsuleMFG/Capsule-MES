-- Add recut flag to work orders
ALTER TABLE work_orders ADD COLUMN is_recut INTEGER NOT NULL DEFAULT 0;
