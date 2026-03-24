import dotenv from 'dotenv'
import path from 'path'

export async function setup() {
  // Load .env from server directory
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })

  // Set test port
  process.env.PORT = process.env.PORT || '3099'

  // Initialize database connection
  const { initializeDatabase } = await import('../models/database')
  await initializeDatabase()
}

export async function teardown() {
  const { closeDatabase } = await import('../models/database')
  closeDatabase()
}
