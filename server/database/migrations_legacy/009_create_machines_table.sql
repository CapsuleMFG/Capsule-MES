-- Migration 009: Create machines table
-- Stores available manufacturing machines for work order assignment

CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for active machines ordered by display_order
CREATE INDEX IF NOT EXISTS idx_machines_active_order ON machines(active, display_order);

-- Seed with existing machines from WorkOrderFiles.tsx
INSERT INTO machines (name, type, active, display_order) VALUES
  ('Laser', 'Cutting', 1, 1),
  ('Press Brake', 'Forming', 1, 2),
  ('Homag', 'CNC', 1, 3),
  ('Zund', 'Cutting', 1, 4),
  ('Howick 2.5', 'Roll Forming', 1, 5),
  ('Howick 3.5', 'Roll Forming', 1, 6),
  ('Howick 8', 'Roll Forming', 1, 7);
