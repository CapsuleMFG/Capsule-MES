import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, $3...
 */
function convertPlaceholders(sql: string): string {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Auto-append RETURNING id to INSERT statements that don't already have it
 */
function ensureReturning(sql: string): string {
    const trimmed = sql.trimEnd().replace(/;$/, '');
    if (!trimmed.toUpperCase().includes('RETURNING')) {
        return trimmed + ' RETURNING id';
    }
    return trimmed;
}

/**
 * Initialize database connection (test connectivity)
 */
export async function initializeDatabase(): Promise<void> {
    const client = await pool.connect();
    client.release();
    console.log('✓ Connected to Supabase PostgreSQL');
}

/**
 * Get the pool (for compatibility)
 */
export async function getDatabase(): Promise<Pool> {
    return pool;
}

/**
 * Execute a SELECT query and return all results
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const converted = convertPlaceholders(sql);
    try {
        const result = await pool.query(converted, params);
        return result.rows as T[];
    } catch (error) {
        console.error('Query error:', error);
        console.error('SQL:', converted);
        console.error('Params:', params);
        throw error;
    }
}

/**
 * Execute a query and return the first result
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 */
export async function execute(sql: string, params: any[] = []): Promise<{ changes: number; lastID: number }> {
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    let converted = convertPlaceholders(sql);
    if (isInsert) {
        converted = ensureReturning(converted);
    }

    try {
        console.log('[DB Execute] SQL:', converted);
        console.log('[DB Execute] Params:', params);

        const result = await pool.query(converted, params);
        const changes = result.rowCount ?? 0;
        const lastID = isInsert ? (result.rows[0]?.id ?? 0) : 0;

        console.log('[DB Execute] Changes:', changes, 'LastID:', lastID);
        return { changes, lastID };
    } catch (error) {
        console.error('Execute error:', error);
        console.error('SQL:', converted);
        console.error('Params:', params);
        throw error;
    }
}

/**
 * Execute multiple SQL statements in a transaction
 */
export async function executeTransaction(sqlStatements: string[]): Promise<void> {
    const client: PoolClient = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const sql of sqlStatements) {
            const converted = convertPlaceholders(sql);
            await client.query(converted);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * No-op: PostgreSQL doesn't need file saving
 */
export function saveDatabase(): void {
    // No-op for PostgreSQL
}

/**
 * Close the connection pool
 */
export function closeDatabase(): void {
    pool.end().then(() => console.log('✓ Database pool closed'));
}
