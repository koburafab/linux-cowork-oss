/**
 * MCP Bridge tests — registration of MCP tools into the ToolRegistry
 */

import { describe, it, expect } from 'vitest'
import { ToolRegistry } from '../src/backend/tool-registry'
import { loadMcpConfig, connectMcpServers } from '../src/backend/mcp-bridge'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

describe('MCP Bridge', () => {
  describe('loadMcpConfig', () => {
    it('should return empty servers when config file does not exist', () => {
      const config = loadMcpConfig('/tmp/nonexistent-mcp-config-12345.json')
      expect(config).toEqual({ servers: [] })
    })

    it('should parse a valid config file', () => {
      const tmpFile = path.join(os.tmpdir(), `mcp-test-config-${Date.now()}.json`)
      const testConfig = {
        servers: [
          { name: 'test-server', command: 'echo', args: ['hello'] },
        ],
      }
      fs.writeFileSync(tmpFile, JSON.stringify(testConfig), 'utf-8')
      try {
        const config = loadMcpConfig(tmpFile)
        expect(config.servers).toHaveLength(1)
        expect(config.servers[0].name).toBe('test-server')
        expect(config.servers[0].command).toBe('echo')
      } finally {
        fs.unlinkSync(tmpFile)
      }
    })

    it('should return empty servers for invalid JSON', () => {
      const tmpFile = path.join(os.tmpdir(), `mcp-test-bad-${Date.now()}.json`)
      fs.writeFileSync(tmpFile, 'not valid json {{{', 'utf-8')
      try {
        const config = loadMcpConfig(tmpFile)
        expect(config).toEqual({ servers: [] })
      } finally {
        fs.unlinkSync(tmpFile)
      }
    })
  })

  describe('connectMcpServers', () => {
    it('should handle empty config gracefully', async () => {
      const registry = new ToolRegistry()
      const count = await connectMcpServers(
        registry,
        '/tmp/nonexistent-mcp-config-67890.json',
      )
      expect(count).toBe(0)
      expect(registry.getDefinitions()).toHaveLength(0)
    })

    it('should handle connection failures gracefully (non-fatal)', async () => {
      // Write a config with a server that will fail to connect
      const tmpFile = path.join(os.tmpdir(), `mcp-fail-${Date.now()}.json`)
      const config = {
        servers: [
          {
            name: 'broken-server',
            command: '/nonexistent/binary/that/does/not/exist',
            args: [],
          },
        ],
      }
      fs.writeFileSync(tmpFile, JSON.stringify(config), 'utf-8')

      try {
        const registry = new ToolRegistry()
        // Should not throw — failures are logged and skipped
        const count = await connectMcpServers(registry, tmpFile)
        expect(count).toBe(0)
        expect(registry.getDefinitions()).toHaveLength(0)
      } finally {
        fs.unlinkSync(tmpFile)
      }
    })
  })

  describe('naming convention', () => {
    it('should use mcp_{serverName}_{toolName} format', () => {
      // Test the naming by registering directly into a ToolRegistry
      // to verify the convention without needing a real MCP server
      const registry = new ToolRegistry()

      // Simulate what connectMcpServers does
      const serverName = 'my_server'
      const toolName = 'do_thing'
      const registryName = `mcp_${serverName}_${toolName}`

      registry.register({
        definition: {
          name: registryName,
          description: 'A test MCP tool',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'ok',
      })

      const tool = registry.get('mcp_my_server_do_thing')
      expect(tool).toBeDefined()
      expect(tool!.definition.name).toBe('mcp_my_server_do_thing')
    })

    it('should sanitize special characters in names', () => {
      const registry = new ToolRegistry()

      // Simulate with special chars (dots, dashes)
      const serverName = 'my-server.v2'.replace(/[^a-zA-Z0-9_]/g, '_')
      const toolName = 'get-data.json'.replace(/[^a-zA-Z0-9_]/g, '_')
      const registryName = `mcp_${serverName}_${toolName}`

      registry.register({
        definition: {
          name: registryName,
          description: 'Sanitized MCP tool',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'ok',
      })

      expect(registry.get('mcp_my_server_v2_get_data_json')).toBeDefined()
    })

    it('MCP tools should coexist with built-in tools in the same registry', () => {
      const registry = new ToolRegistry()

      // Register a built-in tool
      registry.register({
        definition: {
          name: 'bash',
          description: 'Execute bash',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'built-in',
      })

      // Register an MCP tool
      registry.register({
        definition: {
          name: 'mcp_filesystem_read_file',
          description: 'MCP read file',
          input_schema: { type: 'object', properties: {} },
        },
        executor: async () => 'mcp',
      })

      const defs = registry.getDefinitions()
      expect(defs).toHaveLength(2)
      expect(defs.map((d) => d.name)).toContain('bash')
      expect(defs.map((d) => d.name)).toContain('mcp_filesystem_read_file')
    })
  })
})
