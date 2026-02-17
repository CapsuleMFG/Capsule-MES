ALTER TABLE tracked_parts ADD COLUMN work_order_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tracked_parts_work_order_id ON tracked_parts(work_order_id);
