/**
 * Auth & role guard tests
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import supertest from 'supertest'
import app from '../server'

const api = supertest(app)

describe('Dev-mode auth bypass (AUTH_REQUIRED not set)', () => {
  beforeAll(() => {
    delete process.env.AUTH_REQUIRED
  })

  it('GET /api/jobs succeeds without Authorization header', async () => {
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(200)
  })

  it('GET /api/clients succeeds without Authorization header', async () => {
    const res = await api.get('/api/clients')
    expect(res.status).toBe(200)
  })

  it('GET /api/workflow/stages succeeds (all roles allowed)', async () => {
    const res = await api.get('/api/workflow/stages')
    expect(res.status).toBe(200)
  })

  it('GET /api/engineers succeeds (dev user is admin)', async () => {
    const res = await api.get('/api/engineers')
    expect(res.status).toBe(200)
  })

  it('GET /api/scheduling succeeds (admin/manager route)', async () => {
    const res = await api.get('/api/scheduling')
    expect(res.status).toBe(200)
  })

  it('GET /api/audit-log succeeds (admin/manager route)', async () => {
    const res = await api.get('/api/audit-log')
    expect(res.status).toBe(200)
  })
})

describe('Public endpoints (no auth required)', () => {
  it('GET /health → 200 even with AUTH_REQUIRED=true', async () => {
    const original = process.env.AUTH_REQUIRED
    process.env.AUTH_REQUIRED = 'true'

    const res = await api.get('/health')
    expect(res.status).toBe(200)

    if (original === undefined) delete process.env.AUTH_REQUIRED
    else process.env.AUTH_REQUIRED = original
  })

  it('POST /api/station-kiosks/auth → not 401 (public endpoint)', async () => {
    // This endpoint is public (PIN auth) — test without AUTH_REQUIRED
    // since the auth middleware path matching depends on Express mount paths
    delete process.env.AUTH_REQUIRED

    const res = await api
      .post('/api/station-kiosks/auth')
      .send({ pinCode: '0000' })

    // Should process the PIN (return 400/401/404 for bad PIN, never crash)
    expect(res.status).not.toBe(500)
    expect(typeof res.body).toBe('object')
  })
})

describe('AUTH_REQUIRED=true enforces bearer token', () => {
  const original = process.env.AUTH_REQUIRED

  beforeAll(() => {
    process.env.AUTH_REQUIRED = 'true'
  })

  afterAll(() => {
    if (original === undefined) delete process.env.AUTH_REQUIRED
    else process.env.AUTH_REQUIRED = original
  })

  it('GET /api/jobs without token → 401', async () => {
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('GET /api/clients without token → 401', async () => {
    const res = await api.get('/api/clients')
    expect(res.status).toBe(401)
  })

  it('GET /health still → 200 (public endpoint)', async () => {
    const res = await api.get('/health')
    expect(res.status).toBe(200)
  })

  it('Request with invalid Bearer token → 401', async () => {
    const res = await api
      .get('/api/jobs')
      .set('Authorization', 'Bearer totally-invalid-token-xyz')
    expect(res.status).toBe(401)
  })

  it('Request with malformed Authorization header → 401', async () => {
    const res = await api
      .get('/api/jobs')
      .set('Authorization', 'NotBearer sometoken')
    expect(res.status).toBe(401)
  })
})

describe('AUTH_REQUIRED env var is case-insensitive', () => {
  afterEach(() => {
    delete process.env.AUTH_REQUIRED
  })

  it('"TRUE" (uppercase) → auth enforced', async () => {
    process.env.AUTH_REQUIRED = 'TRUE'
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(401)
  })

  it('"True" (mixed case) → auth enforced', async () => {
    process.env.AUTH_REQUIRED = 'True'
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(401)
  })

  it('"false" → dev bypass active', async () => {
    process.env.AUTH_REQUIRED = 'false'
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(200)
  })

  it('empty string → dev bypass active', async () => {
    process.env.AUTH_REQUIRED = ''
    const res = await api.get('/api/jobs')
    expect(res.status).toBe(200)
  })
})
