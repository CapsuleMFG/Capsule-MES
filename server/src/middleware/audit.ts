import { query } from '../models/database';
import type { AuthenticatedUser } from './auth';

/**
 * Logs an action to the audit_log table. Fire-and-forget — errors are
 * logged to console but never propagated to the caller.
 */
export async function logAudit(params: {
  user: AuthenticatedUser | undefined;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string | number | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { user, action, tableName, recordId, oldValues, newValues } = params;
    await query(
      `INSERT INTO audit_log (user_id, user_name, action, table_name, record_id, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.id || null,
        user?.name || 'system',
        action,
        tableName,
        recordId ? String(recordId) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ]
    );
  } catch (error) {
    console.error('Audit log write failed (non-fatal):', error);
  }
}

/**
 * Fetches a row's current state before an UPDATE or DELETE for audit logging.
 * Returns the row as a plain object, or null if not found.
 *
 * SECURITY: tableName and idColumn are interpolated directly into SQL (identifiers
 * cannot be parameterized in PostgreSQL). NEVER pass user-controlled input for
 * these arguments — always use hardcoded string literals at the call site.
 */
export async function fetchCurrentState(
  tableName: string,
  idColumn: string,
  idValue: string | number
): Promise<Record<string, unknown> | null> {
  try {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM ${tableName} WHERE ${idColumn} = $1 LIMIT 1`,
      [idValue]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}
