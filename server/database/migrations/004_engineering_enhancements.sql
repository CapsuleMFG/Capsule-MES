-- Engineering Enhancements: Design Milestones and File Storage

-- Design milestones table for tracking engineering design progress
CREATE TABLE IF NOT EXISTS design_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    milestone_name TEXT NOT NULL, -- Concept, Initial Design, Review, Revision, Final
    status TEXT DEFAULT 'Not Started', -- Not Started, In Progress, Completed
    completed_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Work order files table for storing uploaded WO documents
CREATE TABLE IF NOT EXISTS work_order_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- BOM import history table (optional - for tracking imports)
CREATE TABLE IF NOT EXISTS bom_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    items_imported INTEGER DEFAULT 0,
    imported_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_design_milestones_job_id ON design_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_work_order_files_wo_id ON work_order_files(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_files_job_id ON work_order_files(job_id);
CREATE INDEX IF NOT EXISTS idx_bom_imports_wo_id ON bom_imports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_bom_imports_job_id ON bom_imports(job_id);
