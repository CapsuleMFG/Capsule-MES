-- Migration 015: Station Kiosk Support
-- Maps PIN codes to specific stations for kiosk authentication

CREATE TABLE IF NOT EXISTS station_kiosks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_name TEXT NOT NULL UNIQUE,
    pin_code TEXT NOT NULL UNIQUE,
    machine_id INTEGER,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_station_kiosks_pin ON station_kiosks(pin_code);
CREATE INDEX IF NOT EXISTS idx_station_kiosks_station ON station_kiosks(station_name);
