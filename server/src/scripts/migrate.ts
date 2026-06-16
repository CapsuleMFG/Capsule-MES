/**
 * Forward-only database migration runner.
 *
 * Applies every *.sql file in server/database/migrations that has not yet been
 * recorded in the schema_migrations table, in lexical filename order, each in
 * its own transaction. Forward-only and idempotent: a file is applied at most
 * once (tracked by filename). Halts on the first failure.
 *
 * Run from the server/ directory:  npm run migrate
 * Requires DATABASE_URL in the environment (loaded from server/.env).
 *
 * NOTE: the legacy migrations under database/migrations_legacy/ are historical
 * artifacts (partly SQLite syntax) and are intentionally NOT executed.
 * See database/MIGRATIONS.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase, closeDatabase } from '../models/database';
import { logger } from '../lib/logger';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database', 'migrations');

async function run(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to server/.env before running migrations.');
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.info(`No migrations directory at ${MIGRATIONS_DIR} — nothing to do.`);
    return;
  }

  const pool = await getDatabase();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedRows = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const applied = new Set(appliedRows.rows.map((r) => r.version));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info(`Schema is up to date — ${applied.size} migration(s) already applied.`);
      return;
    }

    logger.info(`Applying ${pending.length} pending migration(s): ${pending.join(', ')}`);

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info(`✓ Applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`✗ Failed ${file} — rolled back. Halting before later migrations.`, {
          error: err instanceof Error ? err.message : err,
        });
        throw err;
      }
    }

    logger.info('All pending migrations applied successfully.');
  } finally {
    client.release();
    closeDatabase();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Migration run failed', { error: err instanceof Error ? err.message : err });
    process.exit(1);
  });
