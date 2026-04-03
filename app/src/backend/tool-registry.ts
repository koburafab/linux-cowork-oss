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
import os from 'node:os'
import { saveMemory, getMemories } from '../core/memory/db'

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
        maxWidth: 1024,
        quality: 40,
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

  registry.register({
    definition: {
      name: 'save_memory',
      description:
        'Save something to remember for future conversations. Use this to store important facts about the user, their preferences, or key information they want you to recall later.',
      input_schema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'What to remember',
          },
        },
        required: ['content'],
      },
    },
    executor: async (input) => {
      const content = input.content as string
      const id = saveMemory({
        type: 'user',
        name: 'memory',
        content,
      })
      return `Saved memory #${id}: ${content}`
    },
  })

  registry.register({
    definition: {
      name: 'recall_memories',
      description:
        'Recall what you know about the user from past conversations. Returns all saved memories.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    executor: async () => {
      const memories = getMemories()
      if (memories.length === 0) {
        return 'No memories saved yet.'
      }
      return JSON.stringify(memories)
    },
  })

  // --- Quick-win tools ---

  registry.register({
    definition: {
      name: 'read_clipboard',
      description: 'Read the current clipboard content.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    executor: async () => {
      try {
        const content = execSync('xclip -selection clipboard -o', {
          encoding: 'utf-8',
          timeout: 5_000,
        })
        return content
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error: ${e.stderr || e.message || 'failed to read clipboard'}`
      }
    },
  })

  registry.register({
    definition: {
      name: 'write_clipboard',
      description: 'Write text to the clipboard.',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to write to clipboard' },
        },
        required: ['text'],
      },
    },
    executor: async (input) => {
      try {
        execSync('xclip -selection clipboard', {
          input: input.text as string,
          encoding: 'utf-8',
          timeout: 5_000,
        })
        return `Clipboard updated (${(input.text as string).length} chars)`
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error: ${e.stderr || e.message || 'failed to write clipboard'}`
      }
    },
  })

  registry.register({
    definition: {
      name: 'system_info',
      description: 'Get system information.',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    executor: async () => {
      const info = {
        hostname: os.hostname(),
        username: os.userInfo().username,
        platform: process.platform,
        uptime: os.uptime(),
        memory: {
          free: os.freemem(),
          total: os.totalmem(),
        },
        display_server: process.env.WAYLAND_DISPLAY || process.env.DISPLAY || 'unknown',
        cpu_model: os.cpus()[0]?.model || 'unknown',
      }
      return JSON.stringify(info)
    },
  })

  registry.register({
    definition: {
      name: 'open_url',
      description: 'Open a URL in the default browser.',
      input_schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to open' },
        },
        required: ['url'],
      },
    },
    executor: async (input) => {
      try {
        const url = input.url as string
        execSync(`xdg-open "${url}"`, {
          timeout: 10_000,
          stdio: 'ignore',
        })
        return `Opened URL: ${url}`
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error: ${e.stderr || e.message || 'failed to open URL'}`
      }
    },
  })

  registry.register({
    definition: {
      name: 'open_app',
      description: 'Open an application by name.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Application name (e.g. "firefox", "nautilus")' },
        },
        required: ['name'],
      },
    },
    executor: async (input) => {
      try {
        const appName = input.name as string
        execSync(`gtk-launch ${appName} 2>/dev/null || ${appName} &`, {
          timeout: 10_000,
          stdio: 'ignore',
          shell: '/bin/bash',
        })
        return `Launched: ${appName}`
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error: ${e.stderr || e.message || 'failed to launch app'}`
      }
    },
  })

  registry.register({
    definition: {
      name: 'youtube_transcript',
      description:
        'Get the transcript/subtitles of a YouTube video by URL or video ID.',
      input_schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description:
              'YouTube URL (e.g. https://youtube.com/watch?v=xxx) or just the video ID',
          },
        },
        required: ['url'],
      },
    },
    executor: async (input) => {
      const raw = (input.url as string).trim()
      const videoId = extractYouTubeVideoId(raw)
      if (!videoId) {
        return `Error: could not extract video ID from "${raw}"`
      }

      // Check yt-dlp is available
      try {
        execSync('which yt-dlp', { encoding: 'utf-8', timeout: 5_000 })
      } catch {
        return 'yt-dlp not installed. Run: sudo apt install yt-dlp'
      }

      try {
        const tmpDir = os.tmpdir()
        const outTemplate = `${tmpDir}/yt-transcript-${videoId}`

        // Clean up any previous files
        try {
          execSync(`rm -f ${outTemplate}*.vtt ${outTemplate}*.json`, {
            timeout: 5_000,
          })
        } catch {
          // ignore
        }

        // Download auto-subs (fr,en) without downloading the video
        execSync(
          `yt-dlp --write-auto-sub --sub-lang "fr,en" --skip-download -o "${outTemplate}" "https://www.youtube.com/watch?v=${videoId}"`,
          { encoding: 'utf-8', timeout: 60_000 },
        )

        // Find the generated .vtt file(s)
        const vttFiles = execSync(`ls ${outTemplate}*.vtt 2>/dev/null || true`, {
          encoding: 'utf-8',
          timeout: 5_000,
        })
          .trim()
          .split('\n')
          .filter(Boolean)

        if (vttFiles.length === 0) {
          return `No subtitles found for video ${videoId}`
        }

        // Read the first available subtitle file and parse VTT
        const vttContent = execSync(`cat "${vttFiles[0]}"`, {
          encoding: 'utf-8',
          timeout: 5_000,
        })

        const transcript = parseVtt(vttContent)

        // Clean up
        try {
          execSync(`rm -f ${outTemplate}*.vtt ${outTemplate}*.json`, {
            timeout: 5_000,
          })
        } catch {
          // ignore
        }

        return transcript || 'Transcript is empty.'
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string }
        return `Error fetching transcript: ${e.stderr || e.message || 'unknown error'}`
      }
    },
  })

  return registry
}

/**
 * Extract a YouTube video ID from various URL formats or a bare ID.
 */
export function extractYouTubeVideoId(input: string): string | null {
  // Already a bare video ID (11 chars, alphanumeric + _ + -)
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return input
  }

  // Standard: youtube.com/watch?v=ID
  const watchMatch = input.match(
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  )
  if (watchMatch) return watchMatch[1]

  // Short: youtu.be/ID
  const shortMatch = input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // Embed: youtube.com/embed/ID
  const embedMatch = input.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  // Shorts: youtube.com/shorts/ID
  const shortsMatch = input.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/)
  if (shortsMatch) return shortsMatch[1]

  return null
}

/**
 * Parse VTT subtitle content into plain text, removing timestamps and duplicates.
 */
function parseVtt(vtt: string): string {
  const lines = vtt.split('\n')
  const textLines: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty, WEBVTT header, timestamps, and NOTE lines
    if (
      !trimmed ||
      trimmed.startsWith('WEBVTT') ||
      trimmed.startsWith('Kind:') ||
      trimmed.startsWith('Language:') ||
      trimmed.startsWith('NOTE') ||
      /^\d{2}:\d{2}/.test(trimmed) ||
      /^[\d]+$/.test(trimmed)
    ) {
      continue
    }
    // Strip VTT tags like <c> </c> <00:01:23.456>
    const clean = trimmed
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    if (clean && !seen.has(clean)) {
      seen.add(clean)
      textLines.push(clean)
    }
  }

  return textLines.join('\n')
}
