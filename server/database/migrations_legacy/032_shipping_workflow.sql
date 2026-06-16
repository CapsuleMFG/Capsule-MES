-- Shipments table: tracks shipping/delivery of completed jobs
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Packing', 'Packed', 'Shipped', 'Delivered')),
  shipping_method TEXT,
  tracking_number TEXT,
  carrier TEXT,
  ship_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  shipping_notes TEXT,
  packed_by TEXT,
  shipped_by TEXT,
  packing_list JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access" ON shipments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read" ON shipments FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_shipments_job_id ON shipments(job_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
