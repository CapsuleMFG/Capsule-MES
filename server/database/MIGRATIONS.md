# Database migrations

The schema lives in **Supabase PostgreSQL**. Schema changes are applied as
forward-only SQL migrations by a small runner (`server/src/scripts/migrate.ts`).

## Layout

- `migrations/` — forward-only PostgreSQL migrations, applied in lexical filename
  order. Each applied filename is recorded in the `schema_migrations` table.
- `migrations_legacy/` — historical artifacts, **not** executed (see its README).
- `schema.sql` — *(to be generated)* canonical dump of the live schema, used as the
  source-of-truth baseline. Regenerate with:
  ```bash
  pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" > database/schema.sql
  # or, via the Supabase CLI:
  supabase db dump --schema public -f database/schema.sql
  ```

## Running

From the `server/` directory, with `DATABASE_URL` set in `server/.env`
(`tsx` is installed as a dev dependency):

```bash
npm run migrate
```

The runner:
1. creates `schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)` if needed,
2. finds `migrations/*.sql` not yet recorded,
3. applies each pending file in filename order, **each in its own transaction**,
4. records the filename in `schema_migrations`,
5. **halts on the first failure** (that file is rolled back; later files are skipped).

It is forward-only and idempotent: each migration is applied at most once.

## Adding a migration

1. Create `migrations/NNN_short_description.sql` (zero-padded, next number).
2. Write PostgreSQL, favouring `IF EXISTS` / `IF NOT EXISTS` where it helps
   re-runnability. One logical change per file.
3. Test against a **scratch / branch database first** — never production.
4. Run `npm run migrate`.

## Baseline note (important)

There is no automated baseline yet. Because the live database already contains the
tables from the legacy migrations, the runner starts from an empty
`schema_migrations` and only applies the **new** files in `migrations/`. Do **not**
copy legacy files into `migrations/` — they would try to recreate existing objects
and fail. New migrations should express genuinely new changes only.
