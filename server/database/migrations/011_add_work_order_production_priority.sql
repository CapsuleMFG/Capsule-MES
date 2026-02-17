-- Add production_priority field to work_orders table
-- This allows production managers to set priority independently from job priority

ALTER TABLE work_orders ADD COLUMN production_priority TEXT CHECK(production_priority IN ('Critical', 'High', 'Medium', 'Low'));
