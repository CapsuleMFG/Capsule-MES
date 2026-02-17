-- Add expected_receive_date column to pbom_items for order tracking
ALTER TABLE pbom_items ADD COLUMN expected_receive_date TEXT;

-- Add index on status for efficient filtering of ordered items
CREATE INDEX IF NOT EXISTS idx_pbom_items_status ON pbom_items(status);
