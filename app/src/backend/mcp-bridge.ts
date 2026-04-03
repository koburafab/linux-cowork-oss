/**
 * MCP Bridge — connects MCP servers and registers their tools in the tool registry.
 *
 * At startup, reads ~/.config/linux-cowork/mcp-servers.json and for each configured
 * server: connects via McpClient, lists tools, and registers them as
 * mcp_{serverName}_{toolName} in the ToolRegistry.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { McpClient, type McpServerConfig } from '../core/mcp/client'
import type { ToolRegistry } from './tool-registry'

const CONFIG_FILE = path.join(
  os.homedir(),
  '.config',
  'linux-cowork',
  'mcp-servers.json',
)

export interface McpServersConfig {
  servers: McpServerConfig[]
}

/** Active MCP clients, keyed by server name */
const activeClients = new Map<string, McpClient>()

/**
 * Sanitize a server/tool name for use in a tool registry key.
 * Replaces non-alphanumeric chars (except underscore) with underscores.
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Load the MCP servers config from disk.
 * Returns empty config if the file does not exist or is invalid.
 */
export function loadMcpConfig(configPath?: string): McpServersConfig {
  const filePath = configPath ?? CONFIG_FILE
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as McpServersConfig
    }
  } catch {
    // ignore parse errors
  }
  return { servers: [] }
}

/**
 * Connect to all configured MCP servers and register their tools.
 *
 * For each server, tools are registered with the naming convention:
 *   mcp_{serverName}_{toolName}
 *
 * Connections that fail are logged and skipped (non-fatal).
 *
 * @returns number of tools registered
 */
export async function connectMcpServers(
  toolRegistry: ToolRegistry,
  configPath?: string,
): Promise<number> {
  const config = loadMcpConfig(configPath)
  let totalRegistered = 0

  for (const serverConfig of config.servers) {
    try {
      const client = new McpClient()
      await client.connect(serverConfig)
      activeClients.set(serverConfig.name, client)

      const mcpTools = await client.listTools()
      const serverKey = sanitizeName(serverConfig.name)

      for (const tool of mcpTools) {
        const toolKey = sanitizeName(tool.name)
        const registryName = `mcp_${serverKey}_${toolKey}`

        toolRegistry.register({
          definition: {
            name: registryName,
            description: tool.description || `MCP tool ${tool.name} from ${serverConfig.name}`,
            input_schema: tool.inputSchema || {
              type: 'object',
              properties: {},
            },
          },
          executor: async (input) => {
            const result = await client.callTool(tool.name, input)
            return typeof result === 'string' ? result : JSON.stringify(result)
          },
        })

        totalRegistered++
      }

      console.log(
        `MCP: connected to "${serverConfig.name}" — ${mcpTools.length} tools registered`,
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(
        `MCP: failed to connect to "${serverConfig.name}": ${msg}`,
      )
    }
  }

  return totalRegistered
}

/**
 * Disconnect all active MCP clients.
 */
export async function disconnectAllMcpClients(): Promise<void> {
  for (const [name, client] of activeClients) {
    try {
      await client.disconnect()
    } catch {
      // ignore disconnect errors
    }
    activeClients.delete(name)
  }
}

/**
 * Get the map of active MCP clients (for testing/inspection).
 */
export function getActiveClients(): ReadonlyMap<string, McpClient> {
  return activeClients
}
