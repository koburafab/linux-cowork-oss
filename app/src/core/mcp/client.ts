/**
 * MCP Client — connects to Model Context Protocol servers via stdio
 * Uses @modelcontextprotocol/sdk Client + StdioClientTransport
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export interface McpServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface McpTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export class McpClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  /**
   * Connect to an MCP server by spawning a child process
   */
  async connect(serverConfig: McpServerConfig): Promise<void> {
    if (this._connected) {
      throw new Error('Already connected. Call disconnect() first.')
    }

    this.transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    })

    this.client = new Client({
      name: 'linux-cowork',
      version: '1.0.0',
    })

    await this.client.connect(this.transport)
    this._connected = true
  }

  /**
   * List available tools from the connected server
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.client || !this._connected) {
      throw new Error('Not connected. Call connect() first.')
    }

    const result = await this.client.listTools()
    return (result.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }))
  }

  /**
   * Call a tool on the connected server
   */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!this.client || !this._connected) {
      throw new Error('Not connected. Call connect() first.')
    }

    const result = await this.client.callTool({ name, arguments: args })
    return result
  }

  /**
   * Disconnect from the server and clean up
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
    this._connected = false
  }
}
