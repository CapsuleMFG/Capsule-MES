-- Migration 014: Parts Tracking System
-- Adds route templates, tracked parts, and station logging

-- Route Templates: reusable sequences of stations (e.g., "Sheet Metal Route")
CREATE TABLE IF NOT EXISTS route_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Route Template Steps: ordered stations within a route template
CREATE TABLE IF NOT EXISTS route_template_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_template_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    station_name TEXT NOT NULL,
    machine_id INTEGER,
    estimated_minutes INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (route_template_id) REFERENCES route_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL,
    UNIQUE(route_template_id, step_order)
);

-- Tracked Parts: individual pieces flowing through manufacturing
CREATE TABLE IF NOT EXISTS tracked_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    bom_item_id INTEGER,
    tracking_id TEXT,
    identification_type TEXT DEFAULT 'Other' CHECK(identification_type IN ('QR', 'Engraved', 'Sticker', 'Other')),
    route_template_id INTEGER,
    current_step_id INTEGER,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Scrapped', 'On Hold')),
    part_number TEXT,
    description TEXT,
    serial_number INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_item_id) REFERENCES bom_items(id) ON DELETE SET NULL,
    FOREIGN KEY (route_template_id) REFERENCES route_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (current_step_id) REFERENCES route_template_steps(id) ON DELETE SET NULL
);

-- Part Station Logs: operator check-in/check-out records at each station
CREATE TABLE IF NOT EXISTS part_station_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracked_part_id INTEGER NOT NULL,
    route_step_id INTEGER NOT NULL,
    operator_name TEXT,
    checked_in_at TEXT DEFAULT (datetime('now')),
    checked_out_at TEXT,
    time_spent_minutes REAL,
    quality_status TEXT DEFAULT 'Pending' CHECK(quality_status IN ('Pass', 'Fail', 'Pending')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tracked_part_id) REFERENCES tracked_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (route_step_id) REFERENCES route_template_steps(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracked_parts_tracking_id ON tracked_parts(tracking_id);
CREATE INDEX IF NOT EXISTS idx_tracked_parts_job_id ON tracked_parts(job_id);
CREATE INDEX IF NOT EXISTS idx_tracked_parts_bom_item_id ON tracked_parts(bom_item_id);
CREATE INDEX IF NOT EXISTS idx_tracked_parts_status ON tracked_parts(status);
CREATE INDEX IF NOT EXISTS idx_part_station_logs_part_id ON part_station_logs(tracked_part_id);
CREATE INDEX IF NOT EXISTS idx_part_station_logs_step_id ON part_station_logs(route_step_id);
CREATE INDEX IF NOT EXISTS idx_route_template_steps_template ON route_template_steps(route_template_id);
