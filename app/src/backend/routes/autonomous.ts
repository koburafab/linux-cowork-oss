/**
 * Autonomous route — POST /api/autonomous
 * Launches a tool-use loop for long-running tasks with computer-use lock.
 */

import { Hono } from 'hono'
import { toolUseLoop } from '../tool-loop'
import type { ToolRegistry } from '../tool-registry'
import type { ModelConfig, ChatMessage } from '../../core/models/types'
import { loadSettings } from '../../core/settings'
import { DEFAULT_MODELS } from '../../core/models/types'
import { acquireLock, releaseLock } from '../../core/computer-use/lock'
import { randomUUID } from 'node:crypto'

type AutonomousMode = 'computer-use' | 'file-ops' | 'auto'

const SYSTEM_PROMPTS: Record<AutonomousMode, string> = {
  'computer-use':
    'You are an autonomous agent controlling a Linux desktop. ' +
    'Take a screenshot first. Describe what you see. Then decide what action to take. ' +
    'After each action, take another screenshot to verify the result. ' +
    'Continue until the task is complete, then stop.',
  'file-ops':
    'You are an autonomous agent with access to the filesystem. ' +
    'Use read_file, write_file, list_directory, and bash tools to accomplish the task. ' +
    'Be careful with destructive operations. Verify your work before finishing.',
  auto:
    'You are an autonomous agent with access to a Linux desktop and filesystem. ' +
    'Choose the best approach: use screenshot + click for GUI tasks, or bash/file tools for CLI tasks. ' +
    'Take a screenshot first to understand the current state. ' +
    'After each action, verify the result. Continue until the task is complete.',
}

export function createAutonomousRoutes(toolRegistry: ToolRegistry): Hono {
  const app = new Hono()

  app.post('/autonomous', async (c) => {
    const body = await c.req.json<{
      task: string
      mode?: AutonomousMode
      model?: string
      maxIterations?: number
      timeoutMs?: number
    }>()

    if (!body.task || typeof body.task !== 'string') {
      return c.json({ error: 'task is required' }, 400)
    }

    const mode: AutonomousMode = body.mode || 'auto'
    const systemPrompt = SYSTEM_PROMPTS[mode]

    const settings = loadSettings()
    const modelConfig: ModelConfig =
      DEFAULT_MODELS.find(
        (m) => m.id === (body.model || settings.activeModel),
      ) || DEFAULT_MODELS[0]

    // Inject API key from settings
    const keys = settings.apiKeys || {}
    if (modelConfig.provider === 'anthropic') {
      modelConfig.apiKey = keys.anthropic || settings.anthropicApiKey || ''
    } else if (modelConfig.baseUrl?.includes('deepseek.com')) {
      modelConfig.apiKey = keys.deepseek || ''
    } else if (modelConfig.baseUrl?.includes('moonshot.cn')) {
      modelConfig.apiKey = keys.moonshot || ''
    } else if (modelConfig.baseUrl?.includes('openrouter.ai')) {
      modelConfig.apiKey = keys.openrouter || ''
    }

    // Acquire computer-use lock
    const sessionId = randomUUID()
    const needsLock = mode === 'computer-use' || mode === 'auto'

    if (needsLock) {
      try {
        acquireLock(sessionId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return c.json({ error: `Cannot acquire lock: ${msg}` }, 409)
      }
    }

    // Set up SSE response
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')

    const history: ChatMessage[] = []

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        function send(event: unknown): void {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        try {
          for await (const event of toolUseLoop(
            body.task,
            history,
            modelConfig,
            toolRegistry,
            {
              maxIterations: body.maxIterations ?? 25,
              timeoutMs: body.timeoutMs ?? 5 * 60 * 1000,
              systemPrompt,
            },
          )) {
            send(event)
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          send({ type: 'error', content: msg })
        } finally {
          if (needsLock) {
            try {
              releaseLock()
            } catch {
              // Lock may already be released
            }
          }
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })

  return app
}
