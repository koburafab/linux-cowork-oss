/**
 * Tool Registry — maps tool names to definitions + executors
 */

import type { ToolDefinition, ContentBlock } from '../core/models/types'
import { captureScreenshot } from '../core/computer-use/screenshot'
import {
  mouseMove,
  mouseClick,
  typeText,
  keyPress,
  listWindows,
  focusWindow,
} from '../core/computer-use/input'
import { readFile, writeFile, listDir } from '../core/file-access'
import { execSync } from 'node:child_process'

export type ToolExecutor = (
  input: Record<string, unknown>,
) => Promise<string | ContentBlock[]>

export interface RegisteredTool {
  definition: ToolDefinition
  executor: ToolExecutor
}

export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map()

  register(tool: RegisteredTool): void {
    this.tools.set(tool.definition.name, tool)
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name)
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition)
  }
}

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry()

  registry.register({
    definition: {
      name: 'screenshot',
      description:
        'Take a screenshot of the current screen. Returns a base64-encoded JPEG image.',
      input_schema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['fullscreen', 'window'],
            description: 'Capture mode: fullscreen or active window',
          },
        },
        required: [],
      },
    },
    executor: async (_input) => {
      const result = await captureScreenshot({
        mode: 'fullscreen',
        maxWidth: 1280,
      })
      return [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: result.base64 || '',
          },
        },
      ]
    },
  })

  registry.register({
    definition: {
      name: 'click',
      description: 'Move the mouse to (x, y) and click.',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
          button: {
            type: 'string',
            enum: ['left', 'right', 'middle'],
            description: 'Mouse button (default: left)',
          },
        },
        required: ['x', 'y'],
      },
    },
    executor: async (input) => {
      const x = input.x as number
      const y = input.y as number
      const button = (input.button as 'left' | 'right' | 'middle') || 'left'
      await mouseMove(x, y)
      await mouseClick(button)
      return `Clicked at (${x}, ${y}) with ${button} button`
    },
  })

  registry.register({
    definition: {
      name: 'type_text',
      description: 'Type text using the keyboard.',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
        },
        required: ['text'],
      },
    },
    executor: async (input) => {
      await typeText(input.text as string)
      return `Typed: ${(input.text as string).slice(0, 50)}`
    },
  })

  registry.register({
    definition: {
      name: 'key_press',
      description:
        'Press keyboard keys or combos (e.g. "ctrl+c", "Return", "alt+F4").',
      input_schema: {
        type: 'object',
        properties: {
          keys: { type: 'string', description: 'Key combo to press' },
        },
        required: ['keys'],
      },
    },
    executor: async (input) => {
      await keyPress(input.keys as string)
      return `Pressed: ${input.keys}`
    },
  })

  registry.register({
    definition: {
      name: 'mouse_move',
      description: 'Move the mouse to coordinates (x, y) without clicking.',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' },
        },
        required: ['x', 'y'],
      },
    },
    executor: async (input) => {
      await mouseMove(input.x as number, input.y as number)
      return `Moved mouse to (${input.x}, ${input.y})`
    },
  })

  registry.register({
    definition: {
      name: 'list_windows',
      description: 'List all open windows with their IDs and titles.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    executor: async () => {
      const windows = listWindows()
      return JSON.stringify(windows)
    },
  })

  registry.register({
    definition: {
      name: 'focus_window',
      description: 'Focus (activate) a window by its window ID.',
      input_schema: {
        type: 'object',
        properties: {
          window_id: {
            type: 'string',
            description: 'Window ID from list_windows',
          },
        },
        required: ['window_id'],
      },
    },
    executor: async (input) => {
      focusWindow(input.window_id as string)
      return `Focused window: ${input.window_id}`
    },
  })

  registry.register({
    definition: {
      name: 'read_file',
      description: 'Read the contents of a file at the given path.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
        },
        required: ['path'],
      },
    },
    executor: async (input) => {
      return readFile(input.path as string)
    },
  })

  registry.register({
    definition: {
      name: 'write_file',
      description: 'Write content to a file, creating directories as needed.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute file path' },
          content: { type: 'string', description: 'File content to write' },
        },
        required: ['path', 'content'],
      },
    },
    executor: async (input) => {
      await writeFile(input.path as string, input.content as string)
      return `Written to ${input.path}`
    },
  })

  registry.register({
    definition: {
      name: 'list_directory',
      description: 'List the contents of a directory.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute directory path' },
        },
        required: ['path'],
      },
    },
    executor: async (input) => {
      const entries = await listDir(input.path as string)
      return JSON.stringify(entries)
    },
  })

  registry.register({
    definition: {
      name: 'bash',
      description: 'Execute a bash command and return stdout.',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Bash command to execute' },
        },
        required: ['command'],
      },
    },
    executor: async (input) => {
      try {
        const result = execSync(input.command as string, {
          stdio: 'pipe',
          timeout: 30_000,
          encoding: 'utf-8',
        })
        return result
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error: ${e.stderr || e.message || 'command failed'}`
      }
    },
  })

  return registry
}
