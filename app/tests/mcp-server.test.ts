/**
 * MCP Server computer use tests
 * Tests server creation, tool schemas, and audit trail
 */

import { describe, it, expect, beforeEach } from 'vitest'

// We need to re-import to get a fresh audit trail module
// The audit trail is module-level state, so we test what we can

describe('MCP Server - createComputerUseMcpServer', () => {
  it('should return an MCP server object', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()

    expect(server).toBeDefined()
    expect(typeof server).toBe('object')
  })

  it('should have connect method', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()

    expect(typeof server.connect).toBe('function')
  })

  it('should have tool method for registering tools', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()

    expect(typeof server.tool).toBe('function')
  })

  it('should have close method', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()

    expect(typeof server.close).toBe('function')
  })
})

describe('MCP Server - Registered tools', () => {
  const EXPECTED_TOOLS = [
    'screenshot',
    'click',
    'type',
    'key',
    'move',
    'list_windows',
    'focus_window',
  ]

  it('should register exactly 7 tools', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools

    expect(tools).toBeDefined()
    expect(Object.keys(tools)).toHaveLength(7)
  })

  it('should register all expected tool names', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools

    for (const name of EXPECTED_TOOLS) {
      expect(tools[name]).toBeDefined()
    }
  })

  it('each tool should have a name and description', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools as Record<
      string,
      { description: string }
    >

    for (const [name, tool] of Object.entries(tools)) {
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
      expect(tool.description.length).toBeGreaterThan(5)
    }
  })

  it('screenshot tool should mention screenshot in description', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools

    expect(tools.screenshot.description.toLowerCase()).toContain('screenshot')
  })

  it('click tool should mention coordinates in description', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools

    expect(tools.click.description.toLowerCase()).toContain('coordinates')
  })

  it('key tool should mention key in description', async () => {
    const { createComputerUseMcpServer } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const server = createComputerUseMcpServer()
    const tools = (server as any)._registeredTools

    expect(tools.key.description.toLowerCase()).toContain('key')
  })
})

describe('MCP Server - Audit trail', () => {
  it('getAuditTrail should return an array', async () => {
    const { getAuditTrail } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const trail = getAuditTrail()

    expect(Array.isArray(trail)).toBe(true)
  })

  it('getAuditTrail should return a copy (not the internal array)', async () => {
    const { getAuditTrail } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const trail1 = getAuditTrail()
    const trail2 = getAuditTrail()

    // Should be equal but not the same reference
    expect(trail1).toEqual(trail2)
    expect(trail1).not.toBe(trail2)
  })

  it('audit entries should have correct shape', async () => {
    const { getAuditTrail } = await import(
      '../src/core/computer-use/mcp-server'
    )
    const trail = getAuditTrail()

    // Each entry (if any) should have the expected fields
    for (const entry of trail) {
      expect(entry).toHaveProperty('timestamp')
      expect(entry).toHaveProperty('tool')
      expect(entry).toHaveProperty('input')
      expect(entry).toHaveProperty('result')
      expect(typeof entry.timestamp).toBe('string')
      expect(typeof entry.tool).toBe('string')
      expect(['success', 'error']).toContain(entry.result)
    }
  })

  it('AuditEntry type should be exported', async () => {
    // This tests that the type export works at runtime (the module loads)
    const mod = await import('../src/core/computer-use/mcp-server')
    expect(mod.getAuditTrail).toBeDefined()
    expect(mod.createComputerUseMcpServer).toBeDefined()
    expect(mod.startMcpServer).toBeDefined()
  })
})
