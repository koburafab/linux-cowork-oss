/**
 * Computer Use MCP Server
 * Exposes screenshot, input, and window management tools via MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { captureScreenshot } from './screenshot'
import {
  mouseClick,
  mouseMove,
  keyPress,
  typeText,
  listWindows,
  focusWindow,
} from './input'

export interface AuditEntry {
  timestamp: string
  tool: string
  input: Record<string, unknown>
  result: 'success' | 'error'
  error?: string
}

const auditTrail: AuditEntry[] = []

function audit(
  tool: string,
  input: Record<string, unknown>,
  result: 'success' | 'error',
  error?: string,
): void {
  auditTrail.push({
    timestamp: new Date().toISOString(),
    tool,
    input,
    result,
    error,
  })
}

export function getAuditTrail(): AuditEntry[] {
  return [...auditTrail]
}

export function createComputerUseMcpServer(): McpServer {
  const server = new McpServer({
    name: 'linux-cowork-computer-use',
    version: '1.0.0',
  })

  // --- screenshot ---
  server.tool(
    'screenshot',
    'Capture a screenshot of the screen. Returns base64-encoded JPEG.',
    {
      mode: z
        .enum(['fullscreen', 'window', 'region'])
        .default('fullscreen')
        .describe('Capture mode: fullscreen, active window, or selected region'),
      quality: z
        .number()
        .min(0)
        .max(100)
        .default(75)
        .describe('JPEG quality (0-100)'),
      maxWidth: z
        .number()
        .optional()
        .describe('Max width in pixels (auto-resize if exceeded)'),
    },
    async ({ mode, quality, maxWidth }) => {
      try {
        const result = await captureScreenshot({ mode, quality, maxWidth })
        audit('screenshot', { mode, quality, maxWidth }, 'success')
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                path: result.path,
                width: result.width,
                height: result.height,
                base64Length: result.base64?.length ?? 0,
              }),
            },
          ],
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('screenshot', { mode, quality, maxWidth }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- click ---
  server.tool(
    'click',
    'Click at the specified screen coordinates.',
    {
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
      button: z
        .enum(['left', 'right', 'middle'])
        .default('left')
        .describe('Mouse button'),
      count: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .default(1)
        .describe('Number of clicks (1-3)'),
    },
    async ({ x, y, button, count }) => {
      try {
        await mouseMove(x, y)
        await mouseClick(button, count as 1 | 2 | 3)
        audit('click', { x, y, button, count }, 'success')
        return { content: [{ type: 'text' as const, text: `Clicked ${button} at (${x}, ${y})` }] }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('click', { x, y, button, count }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- type ---
  server.tool(
    'type',
    'Type text at the current cursor position.',
    {
      text: z.string().describe('Text to type'),
    },
    async ({ text }) => {
      try {
        await typeText(text)
        audit('type', { text }, 'success')
        return { content: [{ type: 'text' as const, text: `Typed ${text.length} characters` }] }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('type', { text }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- key ---
  server.tool(
    'key',
    'Press a key or key combination (e.g. "Return", "ctrl+c", "alt+F4").',
    {
      keys: z.string().describe('Key combination (e.g. "Return", "ctrl+c", "alt+Tab")'),
    },
    async ({ keys }) => {
      try {
        await keyPress(keys)
        audit('key', { keys }, 'success')
        return { content: [{ type: 'text' as const, text: `Pressed: ${keys}` }] }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('key', { keys }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- move ---
  server.tool(
    'move',
    'Move the mouse cursor to the specified coordinates.',
    {
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    },
    async ({ x, y }) => {
      try {
        await mouseMove(x, y)
        audit('move', { x, y }, 'success')
        return { content: [{ type: 'text' as const, text: `Moved to (${x}, ${y})` }] }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('move', { x, y }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- list_windows ---
  server.tool(
    'list_windows',
    'List all visible windows with their IDs, titles, and classes.',
    {},
    async () => {
      try {
        const windows = listWindows()
        audit('list_windows', {}, 'success')
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(windows, null, 2) }],
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('list_windows', {}, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  // --- focus_window ---
  server.tool(
    'focus_window',
    'Bring a window to the foreground by its window ID.',
    {
      windowId: z.string().describe('Window ID (from list_windows)'),
    },
    async ({ windowId }) => {
      try {
        focusWindow(windowId)
        audit('focus_window', { windowId }, 'success')
        return { content: [{ type: 'text' as const, text: `Focused window: ${windowId}` }] }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        audit('focus_window', { windowId }, 'error', msg)
        return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true }
      }
    },
  )

  return server
}

/**
 * Start the MCP server on stdio transport.
 * Call this to run the server as a standalone process.
 */
export async function startMcpServer(): Promise<void> {
  const server = createComputerUseMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
