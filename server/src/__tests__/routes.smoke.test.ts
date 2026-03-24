/**
 * Smoke tests — hit every GET endpoint and verify non-500 response.
 * Runs in dev mode (AUTH_REQUIRED unset) so all requests get admin access.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import app from '../server'
import { dbExecute, uniqueJobNumber } from './setup'

const api = supertest(app)

let testClientId: number
let testJobId: number

beforeAll(async () => {
  delete process.env.AUTH_REQUIRED

  // Create a test client + job so GET endpoints have data
  const c = await dbExecute(
    'INSERT INTO clients (name, contact_name, email) VALUES (?, ?, ?)',
    ['Smoke Test Client', 'Smoke Tester', 'smoke@test.local']
  )
  testClientId = c.lastID

  const j = await dbExecute(
    'INSERT INTO jobs (job_number, client_id, description, status, priority) VALUES (?, ?, ?, ?, ?)',
    [uniqueJobNumber('SMOKE'), testClientId, 'Smoke test job', 'Active', 'Medium']
  )
  testJobId = j.lastID

  // Create workflow progress for the job
  const stages = await dbExecute(
    `INSERT INTO job_workflow_progress (job_id, stage_id, status)
     SELECT ?, id, 'Not Started' FROM workflow_stages ORDER BY display_order`,
    [testJobId]
  )
})

afterAll(async () => {
  await dbExecute('DELETE FROM job_workflow_progress WHERE job_id = ?', [testJobId])
  await dbExecute('DELETE FROM jobs WHERE id = ?', [testJobId])
  await dbExecute('DELETE FROM clients WHERE id = ?', [testClientId])
})

describe('GET endpoint smoke tests', () => {
  const endpoints = [
    { path: '/health', expected: 200 },
    { path: '/api/jobs', expected: 200 },
    { path: '/api/clients', expected: 200 },
    { path: '/api/dashboard/metrics', expected: 200 },
    { path: '/api/workflow/stages', expected: 200 },
    { path: '/api/machines', expected: 200 },
    { path: '/api/inventory', expected: 200 },
    { path: '/api/suppliers', expected: 200 },
    { path: '/api/engineers', expected: 200 },
    { path: '/api/route-templates', expected: 200 },
    { path: '/api/tracked-parts', expected: 200 },
    { path: '/api/station-kiosks', expected: 200 },
    { path: '/api/purchase-orders', expected: 200 },
    { path: '/api/supply-chain/priorities', expected: 200 },
    { path: '/api/scheduling', expected: 200 },
    { path: '/api/shipments', expected: 200 },
    { path: '/api/downtime', expected: 200 },
    { path: '/api/notifications', expected: 200 },
    { path: '/api/profiles', expected: 200 },
    { path: '/api/audit-log', expected: 200 },
    { path: '/api/dashboard/production', expected: 200 },
  ]

  for (const { path, expected } of endpoints) {
    it(`GET ${path} → ${expected}`, async () => {
      const res = await api.get(path)
      expect(res.status).toBe(expected)
      // Must never be 500
      expect(res.status).not.toBe(500)
    })
  }

  it(`GET /api/jobs/:id → 200 for existing job`, async () => {
    const res = await api.get(`/api/jobs/${testJobId}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', testJobId)
  })

  it('GET /api/jobs/99999999 → 404 for non-existent job', async () => {
    const res = await api.get('/api/jobs/99999999')
    expect(res.status).toBe(404)
  })

  it('GET /api/does-not-exist → 404', async () => {
    const res = await api.get('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/nonexistent → 404', async () => {
    const res = await api.post('/api/nonexistent').send({})
    expect(res.status).toBe(404)
  })
})

describe('POST /api/jobs creates a job', () => {
  let createdId: number

  afterAll(async () => {
    if (createdId) {
      await dbExecute('DELETE FROM job_workflow_progress WHERE job_id = ?', [createdId])
      await dbExecute('DELETE FROM jobs WHERE id = ?', [createdId])
    }
  })

  it('POST /api/jobs → 201 with valid body', async () => {
    const res = await api
      .post('/api/jobs')
      .send({
        jobNumber: uniqueJobNumber('SMOKE-POST'),
        clientId: testClientId,
        description: 'Smoke test POST job',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('jobNumber')
    createdId = res.body.id
  })
})
