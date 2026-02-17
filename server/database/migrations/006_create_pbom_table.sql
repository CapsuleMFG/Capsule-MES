-- Migration 006: Create PBOM (Production Bill of Materials) table
-- PBOM is per-job and follows a workflow: Engineering creates → Sends to Supply Chain → SC completes

-- Create pbom_items table
CREATE TABLE IF NOT EXISTS pbom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,

    -- Item details (filled by Engineering)
    description TEXT NOT NULL,
    qty_required REAL NOT NULL,

    -- Vendor/Procurement details (filled by Supply Chain)
    mfr_vendor TEXT,
    mfr_vendor_part TEXT,
    category TEXT,

    -- Supply Chain use only
    req_number TEXT,
    notes TEXT,

    -- PM use only
    po_number TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'Ready' CHECK(status IN ('Ready', 'In Progress', 'Ordered', 'Received')),
    sent_to_sc INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = draft in Engineering, 1 = sent to Supply Chain

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create index for faster job lookups
CREATE INDEX IF NOT EXISTS idx_pbom_items_job_id ON pbom_items(job_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_pbom_items_status ON pbom_items(status);

-- Create index for sent_to_sc filtering
CREATE INDEX IF NOT EXISTS idx_pbom_items_sent_to_sc ON pbom_items(sent_to_sc);
