-- Migration 008: Documentation - BOM Cost Fields Already Removed
-- This migration serves as documentation that migration 007 already removed
-- the obsolete cost-tracking fields (unit_cost, supplier_name, lead_time_days)
-- and replaced them with manufacturing-specific fields (material, thickness,
-- surface_area, powdercoat).
--
-- No action needed - schema is already current.

-- Verify migration 007 completed successfully
SELECT name FROM sqlite_master WHERE type='table' AND name='bom_items';
