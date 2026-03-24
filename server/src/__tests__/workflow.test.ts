/**
 * Core job lifecycle integration tests:
 * Create → Get → Update → Workflow stages → Materials CRUD → Delete
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import app from '../server'
import { dbExecute, dbQuery, dbQueryOne, uniqueJobNumber } from './setup'

const api = supertest(app)

let testClientId: number
let createdJob: any
let workflowStages: any[]

const createdJobIds: number[] = []
const createdClientIds: number[] = []

beforeAll(async () => {
  delete process.env.AUTH_REQUIRED

  const c = await dbExecute(
    'INSERT INTO clients (name, contact_name, email) VALUES (?, ?, ?)',
    ['Workflow Test Client', 'Tester', 'workflow@test.local']
  )
  testClientId = c.lastID
  createdClientIds.push(testClientId)
})

afterAll(async () => {
  for (const jobId of createdJobIds) {
    await dbExecute('DELETE FROM job_workflow_progress WHERE job_id = ?', [jobId])
    await dbExecute('DELETE FROM job_materials WHERE job_id = ?', [jobId])
    await dbExecute('DELETE FROM job_labor WHERE job_id = ?', [jobId])
    await dbExecute('DELETE FROM bom_items WHERE job_id = ?', [jobId])
    await dbExecute('DELETE FROM pbom_items WHERE job_id = ?', [jobId])
    await dbExecute('DELETE FROM jobs WHERE id = ?', [jobId])
  }
  for (const clientId of createdClientIds) {
    await dbExecute('DELETE FROM clients WHERE id = ?', [clientId])
  }
})

// 1. Create a job

describe('POST /api/jobs — create job', () => {
  it('creates a new job → 201 with correct shape', async () => {
    const body = {
      jobNumber: uniqueJobNumber('WF'),
      clientId: testClientId,
      description: 'Workflow integration test job',
      targetStartDate: '2026-04-01',
      targetEndDate: '2026-05-01',
      notes: 'Created by workflow.test.ts',
    }

    const res = await api.post('/api/jobs').send(body)
    expect(res.status).toBe(201)

    const job = res.body
    expect(typeof job.id).toBe('number')
    expect(job.jobNumber).toBe(body.jobNumber)
    expect(job.clientId).toBe(body.clientId)
    expect(job.description).toBe(body.description)
    expect(job.status).toBe('Active')

    createdJob = job
    createdJobIds.push(job.id)
  })

  it('returns 400 for duplicate job number', async () => {
    const res = await api.post('/api/jobs').send({
      jobNumber: createdJob.jobNumber,
      clientId: testClientId,
      description: 'Duplicate test',
    })
    expect(res.status).toBe(400)
  })
})

// 2. Get job by ID

describe('GET /api/jobs/:id — get job', () => {
  it('returns the created job with all fields', async () => {
    const res = await api.get(`/api/jobs/${createdJob.id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdJob.id)
    expect(res.body.jobNumber).toBe(createdJob.jobNumber)
    expect(typeof res.body.clientName).toBe('string')
  })

  it('includes workflowProgress array', async () => {
    const res = await api.get(`/api/jobs/${createdJob.id}`)
    expect(Array.isArray(res.body.workflowProgress)).toBe(true)
  })

  it('returns 404 for non-existent job', async () => {
    const res = await api.get('/api/jobs/99999999')
    expect(res.status).toBe(404)
  })
})

// 3. Update job

describe('PUT /api/jobs/:id — update job', () => {
  it('updates description and priority', async () => {
    const res = await api.put(`/api/jobs/${createdJob.id}`).send({
      description: 'UPDATED description',
      priority: 'High',
    })
    expect(res.status).toBe(200)
    expect(res.body.description).toBe('UPDATED description')
    expect(res.body.priority).toBe('High')
    expect(res.body.jobNumber).toBe(createdJob.jobNumber) // unchanged
  })

  it('persists changes to database', async () => {
    const newDesc = `persist-check-${Date.now()}`
    await api.put(`/api/jobs/${createdJob.id}`).send({ description: newDesc })

    const row = await dbQueryOne<{ description: string }>(
      'SELECT description FROM jobs WHERE id = ?',
      [createdJob.id]
    )
    expect(row).not.toBeNull()
    expect(row!.description).toBe(newDesc)
  })

  it('returns 400 for empty update body', async () => {
    const res = await api.put(`/api/jobs/${createdJob.id}`).send({
      unknownField: 'value',
    })
    expect(res.status).toBe(400)
  })
})

// 4. Workflow stages

describe('GET /api/jobs/:id/workflow — workflow stages', () => {
  it('returns exactly 4 stages', async () => {
    const res = await api.get(`/api/jobs/${createdJob.id}/workflow`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(4)
    workflowStages = res.body
  })

  it('contains Engineering, WO Release, Materials, Production', async () => {
    const names = workflowStages.map((s: any) => s.stage_name)
    expect(names).toContain('Engineering')
    expect(names).toContain('WO Release')
    expect(names).toContain('Materials')
    expect(names).toContain('Production')
  })

  it('each stage has required properties', async () => {
    for (const stage of workflowStages) {
      expect(typeof stage.id).toBe('number')
      expect(typeof stage.stage_id).toBe('number')
      expect(typeof stage.stage_name).toBe('string')
      expect(['Not Started', 'In Progress', 'Completed', 'Blocked']).toContain(stage.status)
    }
  })
})

// 5. Update workflow stage

describe('PUT /api/jobs/:id/workflow/:stageId — update stage', () => {
  let engineeringStage: any

  beforeAll(() => {
    engineeringStage = workflowStages.find((s: any) => s.stage_name === 'Engineering')
    if (!engineeringStage) throw new Error('Engineering stage not found')
  })

  it('updates to In Progress', async () => {
    const res = await api
      .put(`/api/jobs/${createdJob.id}/workflow/${engineeringStage.stage_id}`)
      .send({ status: 'In Progress' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('In Progress')
  })

  it('updates to Completed', async () => {
    const res = await api
      .put(`/api/jobs/${createdJob.id}/workflow/${engineeringStage.stage_id}`)
      .send({ status: 'Completed' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Completed')
  })

  it('resets to Not Started', async () => {
    const res = await api
      .put(`/api/jobs/${createdJob.id}/workflow/${engineeringStage.stage_id}`)
      .send({ status: 'Not Started' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Not Started')
  })

  it('persists to database', async () => {
    await api
      .put(`/api/jobs/${createdJob.id}/workflow/${engineeringStage.stage_id}`)
      .send({ status: 'Blocked' })

    const row = await dbQueryOne<{ status: string }>(
      'SELECT status FROM job_workflow_progress WHERE job_id = ? AND stage_id = ?',
      [createdJob.id, engineeringStage.stage_id]
    )
    expect(row!.status).toBe('Blocked')
  })
})

// 6. Materials CRUD

describe('Job materials CRUD', () => {
  let materialId: number

  it('POST creates material → 201', async () => {
    const res = await api
      .post(`/api/jobs/${createdJob.id}/materials`)
      .send({
        materialName: 'Test Steel Sheet',
        quantity: 10,
        unit: 'pcs',
        status: 'Needed',
        cost: 25.5,
        supplier: 'Test Supplier',
      })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    materialId = res.body.id
  })

  it('GET returns the material', async () => {
    const res = await api.get(`/api/jobs/${createdJob.id}/materials`)
    expect(res.status).toBe(200)
    const found = res.body.find((m: any) => m.id === materialId)
    expect(found).toBeDefined()
  })

  it('PUT updates the material', async () => {
    const res = await api
      .put(`/api/jobs/${createdJob.id}/materials/${materialId}`)
      .send({ status: 'Ordered', quantity: 20 })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Ordered')
  })

  it('DELETE removes the material → 204', async () => {
    const res = await api.delete(`/api/jobs/${createdJob.id}/materials/${materialId}`)
    expect(res.status).toBe(204)

    const row = await dbQueryOne('SELECT id FROM job_materials WHERE id = ?', [materialId])
    expect(row).toBeNull()
  })
})

// 7. Delete job

describe('DELETE /api/jobs/:id — delete with cascade', () => {
  let deleteJobId: number

  beforeAll(async () => {
    const res = await api.post('/api/jobs').send({
      jobNumber: uniqueJobNumber('WF-DEL'),
      clientId: testClientId,
      description: 'Job for deletion test',
    })
    deleteJobId = res.body.id
    // Not added to createdJobIds since we delete it in the test
  })

  it('DELETE → 204', async () => {
    const res = await api.delete(`/api/jobs/${deleteJobId}`)
    expect(res.status).toBe(204)
  })

  it('GET → 404 after deletion', async () => {
    const res = await api.get(`/api/jobs/${deleteJobId}`)
    expect(res.status).toBe(404)
  })

  it('workflow rows cleaned up', async () => {
    const rows = await dbQuery(
      'SELECT id FROM job_workflow_progress WHERE job_id = ?',
      [deleteJobId]
    )
    expect(rows.length).toBe(0)
  })
})

// 8. Jobs list

describe('GET /api/jobs — list', () => {
  it('includes the test job', async () => {
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(200)
    const found = res.body.find((j: any) => j.id === createdJob.id)
    expect(found).toBeDefined()
  })

  it('search filters by job number', async () => {
    const prefix = createdJob.jobNumber.substring(0, 8)
    const res = await api.get(`/api/jobs?search=${encodeURIComponent(prefix)}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
  })
})
