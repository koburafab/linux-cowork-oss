/**
 * MCP routes — manage MCP server connections and tools
 */

import { Hono } from 'hono'
import { McpClient, type McpServerConfig } from '../../core/mcp/client'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'linux-cowork')
const CONFIG_FILE = path.join(CONFIG_DIR, 'mcp-servers.json')

export interface McpServersConfig {
  servers: McpServerConfig[]
}

/** Connected MCP clients keyed by server name */
const connectedClients = new Map<string, McpClient>()

function loadConfig(): McpServersConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return JSON.parse(raw) as McpServersConfig
    }
  } catch {
    // ignore parse errors, return default
  }
  return { servers: [] }
}

function saveConfig(config: McpServersConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

export function createMcpRoutes(): Hono {
  const app = new Hono()

  // GET /mcp/servers — list configured MCP servers
  app.get('/mcp/servers', (c) => {
    try {
      const config = loadConfig()
      const servers = config.servers.map((s) => ({
        ...s,
        connected: connectedClients.has(s.name),
      }))
      return c.json({ servers })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  // POST /mcp/servers — add a new MCP server config
  app.post('/mcp/servers', async (c) => {
    try {
      const body = await c.req.json<{ name?: string; command?: string; args?: string[] }>()
      const { name, command, args } = body

      if (!name || !command) {
        return c.json({ error: 'name and command are required' }, 400)
      }

      const config = loadConfig()

      // Check for duplicate name
      if (config.servers.some((s) => s.name === name)) {
        return c.json({ error: `Server "${name}" already exists` }, 409)
      }

      const server: McpServerConfig = {
        name,
        command,
        args: args || [],
      }
      config.servers.push(server)
      saveConfig(config)

      return c.json({ server }, 201)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  // POST /mcp/connect/:name — connect to a configured MCP server
  app.post('/mcp/connect/:name', async (c) => {
    try {
      const name = decodeURIComponent(c.req.param('name'))
      const config = loadConfig()
      const serverConfig = config.servers.find((s) => s.name === name)

      if (!serverConfig) {
        return c.json({ error: `Server "${name}" not found` }, 404)
      }

      // Disconnect existing client if any
      if (connectedClients.has(name)) {
        const existing = connectedClients.get(name)!
        await existing.disconnect()
        connectedClients.delete(name)
      }

      const client = new McpClient()
      await client.connect(serverConfig)
      connectedClients.set(name, client)

      return c.json({ connected: true, name })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  // GET /mcp/tools/:name — list tools from a connected MCP server
  app.get('/mcp/tools/:name', async (c) => {
    try {
      const name = decodeURIComponent(c.req.param('name'))
      const client = connectedClients.get(name)

      if (!client) {
        return c.json({ error: `Server "${name}" is not connected` }, 404)
      }

      const tools = await client.listTools()
      return c.json({ tools })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  return app
}
