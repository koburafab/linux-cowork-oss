import { describe, it, expect } from 'vitest'
import { createServer } from '../src/backend/server'

describe('Workflow routes', () => {
  const app = createServer()

  it('GET /api/workflows returns 6 workflows', async () => {
    const res = await app.request('/api/workflows')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workflows).toHaveLength(6)
  })

  it('each workflow has id, name, icon, prompt', async () => {
    const res = await app.request('/api/workflows')
    const data = await res.json()
    for (const wf of data.workflows) {
      expect(typeof wf.id).toBe('string')
      expect(typeof wf.name).toBe('string')
      expect(typeof wf.icon).toBe('string')
      expect(typeof wf.prompt).toBe('string')
      expect(wf.id.length).toBeGreaterThan(0)
      expect(wf.name.length).toBeGreaterThan(0)
      expect(wf.icon.length).toBeGreaterThan(0)
      expect(wf.prompt.length).toBeGreaterThan(0)
    }
  })

  it('POST /api/workflows/:id/run returns 400 for unknown id', async () => {
    const res = await app.request('/api/workflows/nonexistent/run', {
      method: 'POST',
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('not found')
  })

  it('POST /api/workflows/:id/run returns prompt for valid id', async () => {
    const res = await app.request('/api/workflows/system-health/run', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.prompt).toContain('disk usage')
    expect(data.workflow.id).toBe('system-health')
  })
})
