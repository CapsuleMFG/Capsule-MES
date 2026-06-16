# Legacy migrations (historical — NOT executed)

These SQL files are the historical record of how the schema evolved while the
project was on SQLite/sql.js and during the early Supabase/PostgreSQL move. They
are **not** run by the migration runner and should be treated as read-only history.

- Files `001`–`026` use SQLite syntax (`AUTOINCREMENT`, `datetime('now')`, …) and
  will **not** execute on PostgreSQL.
- The live Supabase schema was created out-of-band, so these files do not
  necessarily match the current database column-for-column.

Going forward, all schema changes live in `../migrations/` as forward-only
PostgreSQL migrations applied by `npm run migrate`. See `../MIGRATIONS.md`.

Kept for reference (column origins, intent, evolution). Do not edit or re-run.
