/**
 * Chat route — POST /api/chat with SSE streaming + tool-use loop
 */

import { Hono } from 'hono'
import { toolUseLoop } from '../tool-loop'
import type { ToolRegistry } from '../tool-registry'
import type { ModelConfig, ChatMessage } from '../../core/models/types'
import { loadSettings } from '../../core/settings'
import { DEFAULT_MODELS } from '../../core/models/types'

export function createChatRoutes(toolRegistry: ToolRegistry): Hono {
  const app = new Hono()

  app.post('/chat', async (c) => {
    const body = await c.req.json<{
      message: string
      history?: ChatMessage[]
      model?: string
    }>()

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ error: 'message is required' }, 400)
    }

    const settings = loadSettings()
    const modelConfig: ModelConfig =
      DEFAULT_MODELS.find((m) => m.id === (body.model || settings.activeModel)) ||
      DEFAULT_MODELS[0]

    // Inject API key from settings — keys stay server-side, never sent to WebView
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

    const history = body.history || []

    // Set up SSE response
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const event of toolUseLoop(
            body.message,
            history,
            modelConfig,
            toolRegistry,
          )) {
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          const data = JSON.stringify({ type: 'error', content: msg })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } finally {
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
