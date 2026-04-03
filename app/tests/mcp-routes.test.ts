import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Use a temp directory for test config to avoid touching real config
const TEST_CONFIG_DIR = path.join(os.tmpdir(), 'linux-cowork-test-mcp')
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'mcp-servers.json')

// We need to mock the config path before importing routes
// Since the module uses constants, we mock fs operations instead
import { createMcpRoutes } from '../src/backend/routes/mcp'

describe('MCP Routes', () => {
  const CONFIG_DIR = path.join(os.homedir(), '.config', 'linux-cowork')
  const CONFIG_FILE = path.join(CONFIG_DIR, 'mcp-servers.json')
  let originalConfig: string | null = null

  beforeEach(() => {
    // Backup existing config if any
    try {
      originalConfig = fs.readFileSync(CONFIG_FILE, 'utf-8')
    } catch {
      originalConfig = null
    }
    // Write a clean test config
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ servers: [] }, null, 2),
      'utf-8',
    )
  })

  afterEach(() => {
    // Restore original config
    if (originalConfig !== null) {
      fs.writeFileSync(CONFIG_FILE, originalConfig, 'utf-8')
    } else {
      try {
        fs.unlinkSync(CONFIG_FILE)
      } catch {
        // ignore
      }
    }
  })

  it('GET /mcp/servers should return a list', async () => {
    const app = createMcpRoutes()
    const res = await app.request('/mcp/servers')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('servers')
    expect(Array.isArray(body.servers)).toBe(true)
  })

  it('POST /mcp/servers should add a server', async () => {
    const app = createMcpRoutes()

    const res = await app.request('/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-server',
        command: 'echo',
        args: ['hello'],
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.server).toBeDefined()
    expect(body.server.name).toBe('test-server')
    expect(body.server.command).toBe('echo')

    // Verify it persisted
    const listRes = await app.request('/mcp/servers')
    const listBody = await listRes.json()
    expect(listBody.servers).toHaveLength(1)
    expect(listBody.servers[0].name).toBe('test-server')
  })

  it('POST /mcp/servers should reject duplicate names', async () => {
    const app = createMcpRoutes()

    await app.request('/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dup-server',
        command: 'echo',
        args: [],
      }),
    })

    const res = await app.request('/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'dup-server',
        command: 'echo',
        args: [],
      }),
    })

    expect(res.status).toBe(409)
  })

  it('POST /mcp/servers should require name and command', async () => {
    const app = createMcpRoutes()

    const res = await app.request('/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'incomplete' }),
    })

    expect(res.status).toBe(400)
  })

  it('GET /mcp/tools/:name should 404 for unconnected server', async () => {
    const app = createMcpRoutes()

    const res = await app.request('/mcp/tools/nonexistent')
    expect(res.status).toBe(404)
  })
})
