-- In-app notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  category TEXT CHECK (category IN ('machine_down', 'quality_fail', 'po_received', 'job_completed', 'shipment', 'system')),
  reference_type TEXT,
  reference_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read own" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Authenticated users can update own" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
