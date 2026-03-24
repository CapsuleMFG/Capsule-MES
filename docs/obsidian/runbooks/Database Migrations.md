# Database Migrations

How to create and apply database migrations for Capsule MES.

## Location
All migrations live in `server/database/migrations/` as numbered SQL files.

## Naming Convention
```
NNN_description.sql
```
Examples: `001_create_tables.sql`, `026_purchase_orders.sql`

Next migration: **027**

## Rules
1. **Additive only** — never `DROP TABLE`, `DROP COLUMN`, or `ALTER COLUMN RENAME`
2. Use `IF NOT EXISTS` / `IF EXISTS` guards
3. Include `created_at` and `updated_at` timestamps on new tables
4. Use `SERIAL PRIMARY KEY` for auto-increment IDs
5. Add foreign key constraints with appropriate `ON DELETE` behavior
6. Add indexes for columns used in WHERE clauses and JOINs

## Template
```sql
-- Migration NNN: Description
-- Date: YYYY-MM-DD

CREATE TABLE IF NOT EXISTS my_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES parent_table(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_table_parent_id ON my_table(parent_id);
```

## Applying Migrations

### Via Supabase MCP
Use the Supabase MCP tool to execute SQL directly against the database.

### Manually
Connect to the Supabase database and run the SQL file contents.

## Current Migrations
See [[Migrations Log]] for the full list of 26 applied migrations.

## After Creating a Migration
1. Apply the migration to the database
2. Update `shared/types/index.ts` with new interfaces
3. Create/update controller and routes
4. Test with the running application

---
See also: [[Migrations Log]] · [[Schema Overview]] · [[Adding a Feature]]
