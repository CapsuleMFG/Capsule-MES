-- Link part station logs and job labor to user profiles
-- operator_name is kept for backward compatibility with historical data
-- New entries should populate both operator_name and user_id

ALTER TABLE part_station_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE job_labor ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
