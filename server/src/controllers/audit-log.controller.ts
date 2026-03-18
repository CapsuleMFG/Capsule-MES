import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

interface AuditRow {
  id: number;
  user_id: string | null;
  user_name: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

function mapAuditEntry(row: AuditRow) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    tableName: row.table_name,
    recordId: row.record_id,
    oldValues: row.old_values,
    newValues: row.new_values,
    createdAt: row.created_at,
  };
}

// GET /api/audit-log
export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId,
      action,
      tableName,
      from,
      to,
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(userId);
    }
    if (action) {
      conditions.push(`action = $${paramIdx++}`);
      params.push(action);
    }
    if (tableName) {
      conditions.push(`table_name = $${paramIdx++}`);
      params.push(tableName);
    }
    if (from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(to + 'T23:59:59Z');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_log ${where}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const limitParam = paramIdx++;
    const offsetParam = paramIdx++;
    const rows = await query<AuditRow>(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limitNum, offset]
    );

    res.json({
      data: rows.map(mapAuditEntry),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};
