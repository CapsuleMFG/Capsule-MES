-- Add machine down status fields
-- is_down takes priority over derived status in dashboard queries

ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_down BOOLEAN DEFAULT false;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS down_reason TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS down_since TIMESTAMPTZ;
