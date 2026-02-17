-- Migration 026: Purchase Orders table for consolidated order tracking
-- Mass orders from Global Inventory create one PO row instead of tracking per-PBOM-item

CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT,
    inventory_id INTEGER,
    description TEXT NOT NULL,
    qty_ordered REAL NOT NULL DEFAULT 0,
    qty_received REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ordered' CHECK(status IN ('Ordered', 'Partial', 'Received')),
    expected_receive_date TEXT,
    vendor TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (inventory_id) REFERENCES global_inventory(id) ON DELETE SET NULL
);

-- Link PBOM items to their parent purchase order
ALTER TABLE pbom_items ADD COLUMN purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL;
