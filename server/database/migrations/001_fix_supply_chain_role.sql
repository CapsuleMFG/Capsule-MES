-- 001: Align profiles.role CHECK constraint with the roles used in code and UI.
--
-- The application (server/src/middleware/auth.ts) and the User Management UI
-- recognize five roles: admin, manager, engineer, supply_chain, operator.
-- The legacy profiles definition (migrations_legacy/027_profiles.sql) only
-- allowed four (no supply_chain), so creating or updating a supply_chain user
-- fails on the CHECK constraint.
--
-- If the live constraint is named differently than the PostgreSQL default
-- 'profiles_role_check', inspect it first and adjust the DROP below to match:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'profiles'::regclass AND contype = 'c';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'engineer', 'supply_chain', 'operator'));
