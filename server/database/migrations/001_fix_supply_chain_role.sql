-- 001: Ensure profiles.role CHECK constraint allows all five application roles.
--
-- The application (server/src/middleware/auth.ts) and the User Management UI
-- recognize five roles: admin, manager, engineer, supply_chain, operator. The
-- legacy profiles definition (migrations_legacy/027_profiles.sql) only allowed
-- four (no supply_chain).
--
-- NOTE: verified 2026-06-16 that the live production database ALREADY has this
-- 5-role constraint (named 'profiles_role_check'), so this migration is a no-op
-- there. It is kept as an idempotent parity/guard migration — it corrects any
-- environment still on the legacy 027 definition and documents the canonical
-- constraint for a rebuilt/baselined database. Safe to run repeatedly.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'engineer', 'supply_chain', 'operator'));
