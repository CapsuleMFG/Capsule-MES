-- Migration 013: Link PBOM items to global inventory with allocation tracking
-- Adds global_inventory_id FK and qty_allocated to pbom_items

ALTER TABLE pbom_items ADD COLUMN global_inventory_id INTEGER REFERENCES global_inventory(id) ON DELETE SET NULL;
ALTER TABLE pbom_items ADD COLUMN qty_allocated REAL NOT NULL DEFAULT 0;
CREATE INDEX idx_pbom_items_inventory ON pbom_items(global_inventory_id);
