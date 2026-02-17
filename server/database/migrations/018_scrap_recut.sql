-- Add scrap reason and recut tracking to tracked_parts
ALTER TABLE tracked_parts ADD COLUMN scrap_reason TEXT;
ALTER TABLE tracked_parts ADD COLUMN scrapped_at TEXT;
ALTER TABLE tracked_parts ADD COLUMN recut_from_id INTEGER REFERENCES tracked_parts(id) ON DELETE SET NULL;
