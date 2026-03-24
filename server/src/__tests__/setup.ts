import { query, queryOne, execute } from '../models/database'

// Re-export database helpers for test use
export const dbQuery = query
export const dbQueryOne = queryOne
export const dbExecute = execute

/**
 * Generate a unique job number for tests to prevent collisions
 */
export function uniqueJobNumber(prefix = 'TEST'): string {
  const ts = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${ts}-${rand}`
}
