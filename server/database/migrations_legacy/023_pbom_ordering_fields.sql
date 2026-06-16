-- Add qty_ordered and qty_received fields to pbom_items
ALTER TABLE pbom_items ADD COLUMN qty_ordered REAL DEFAULT 0;
ALTER TABLE pbom_items ADD COLUMN qty_received REAL DEFAULT 0;
