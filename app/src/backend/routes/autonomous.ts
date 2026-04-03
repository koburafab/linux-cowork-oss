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
import { notify } from '../../core/notifications'
import { captureScreenshot } from '../../core/computer-use/screenshot'

type AutonomousMode = 'computer-use' | 'file-ops' | 'auto' | 'vision-loop'

const MEMORY_PROMPT =
  'You have persistent memory via save_memory and recall_memories tools. ' +
  'Use save_memory to remember important facts. Memories persist across sessions. '

const SYSTEM_PROMPTS: Record<AutonomousMode, string> = {
  'computer-use':
    'You are an autonomous agent controlling a Linux desktop. ' +
    'Take a screenshot first. Describe what you see. Then decide what action to take. ' +
    'After each action, take another screenshot to verify the result. ' +
    'Continue until the task is complete, then stop. ' + MEMORY_PROMPT,
  'file-ops':
    'You are an autonomous agent with access to the filesystem. ' +
    'Use read_file, write_file, list_directory, and bash tools to accomplish the task. ' +
    'Be careful with destructive operations. Verify your work before finishing. ' + MEMORY_PROMPT,
  auto:
    'You are an autonomous agent with access to a Linux desktop and filesystem. ' +
    'Choose the best approach: use screenshot + click for GUI tasks, or bash/file tools for CLI tasks. ' +
    'After each action, verify the result. Continue until the task is complete. ' + MEMORY_PROMPT,
  'vision-loop':
    'You are a vision-loop agent continuously observing the screen. ' +
    'Analyze each screenshot. Respond with JSON: {"action":"wait"} if nothing to do, ' +
    'or {"action":"act","description":"what to do"} if you see something actionable. ' +
    'Be concise.',
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
    } else if (modelConfig.baseUrl?.includes('moonshot.ai') || modelConfig.baseUrl?.includes('moonshot.cn')) {
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
          let lastText = ''
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
            if (event.type === 'text' && event.content) {
              lastText = event.content
            }
            if (event.type === 'done') {
              const summary = (lastText || body.task).slice(0, 80)
              notify('Linux Cowork', `Autonomous task completed: ${summary}`)
            }
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

  // --- Vision loop mode ---
  app.post('/autonomous/vision-loop', async (c) => {
    const body = await c.req.json<{
      task: string
      model?: string
      intervalMs?: number
      maxIterations?: number
      timeoutMs?: number
    }>()

    if (!body.task || typeof body.task !== 'string') {
      return c.json({ error: 'task is required' }, 400)
    }

    const intervalMs = body.intervalMs ?? 2000
    const maxIterations = body.maxIterations ?? 150
    const timeoutMs = body.timeoutMs ?? 5 * 60 * 1000
    const systemPrompt = SYSTEM_PROMPTS['vision-loop']

    const settings = loadSettings()
    const modelConfig: ModelConfig =
      DEFAULT_MODELS.find(
        (m) => m.id === (body.model || settings.activeModel),
      ) || DEFAULT_MODELS[0]

    // Inject API key
    const keys = settings.apiKeys || {}
    if (modelConfig.provider === 'anthropic') {
      modelConfig.apiKey = keys.anthropic || settings.anthropicApiKey || ''
    } else if (modelConfig.baseUrl?.includes('deepseek.com')) {
      modelConfig.apiKey = keys.deepseek || ''
    } else if (modelConfig.baseUrl?.includes('moonshot.ai') || modelConfig.baseUrl?.includes('moonshot.cn')) {
      modelConfig.apiKey = keys.moonshot || ''
    } else if (modelConfig.baseUrl?.includes('openrouter.ai')) {
      modelConfig.apiKey = keys.openrouter || ''
    }

    // Acquire lock
    const sessionId = randomUUID()
    try {
      acquireLock(sessionId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: `Cannot acquire lock: ${msg}` }, 409)
    }

    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        function send(event: unknown): void {
          const data = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        const startTime = Date.now()
        try {
          for (let i = 0; i < maxIterations; i++) {
            if (Date.now() - startTime >= timeoutMs) {
              send({ type: 'error', content: 'Vision loop timeout' })
              break
            }

            // Capture screenshot
            let screenshot: { base64?: string }
            try {
              screenshot = await captureScreenshot({ mode: 'fullscreen', quality: 60 })
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              send({ type: 'error', content: `Screenshot failed: ${msg}` })
              break
            }

            const base64 = screenshot.base64 ?? ''

            // Emit screenshot event
            send({ type: 'screenshot', base64, timestamp: Date.now() })

            // Ask the model to analyze
            const userMsg = `Screenshot captured. Task: ${body.task}\nAnalyze the screenshot and decide: act or wait.`
            const messages: ChatMessage[] = [
              { role: 'system', content: systemPrompt, timestamp: Date.now() },
              { role: 'user', content: userMsg, timestamp: Date.now() },
            ]

            try {
              // Use the tool loop for a single iteration (model decides)
              for await (const event of toolUseLoop(
                userMsg,
                [],
                modelConfig,
                toolRegistry,
                {
                  maxIterations: 1,
                  timeoutMs: 30_000,
                  systemPrompt,
                },
              )) {
                if (event.type === 'text') {
                  send({ type: 'text', content: event.content })
                }
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err)
              send({ type: 'error', content: msg })
            }

            // Wait before next iteration
            await new Promise((r) => setTimeout(r, intervalMs))
          }

          send({ type: 'done' })
        } finally {
          try {
            releaseLock()
          } catch {
            // Already released
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
