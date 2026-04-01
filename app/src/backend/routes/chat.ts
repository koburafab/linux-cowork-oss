/**
 * Chat route — POST /api/chat with SSE streaming + tool-use loop
 */

import { Hono } from 'hono'
import { toolUseLoop } from '../tool-loop'
import { modelRouter } from '../../core/models/router'
import type { ToolRegistry } from '../tool-registry'
import type { ModelConfig, ChatMessage, StreamChunk } from '../../core/models/types'
import { loadSettings } from '../../core/settings'
import { DEFAULT_MODELS } from '../../core/models/types'

function resolveModelConfig(body: { model?: string }): ModelConfig {
  const settings = loadSettings()
  const config: ModelConfig =
    DEFAULT_MODELS.find((m) => m.id === (body.model || settings.activeModel)) ||
    DEFAULT_MODELS[0]

  const keys = settings.apiKeys || {}
  if (config.provider === 'anthropic') {
    config.apiKey = keys.anthropic || settings.anthropicApiKey || ''
  } else if (config.baseUrl?.includes('deepseek.com')) {
    config.apiKey = keys.deepseek || ''
  } else if (config.baseUrl?.includes('moonshot.cn')) {
    config.apiKey = keys.moonshot || ''
  } else if (config.baseUrl?.includes('openrouter.ai')) {
    config.apiKey = keys.openrouter || ''
  }

  return config
}

function sseStream(
  generator: () => AsyncGenerator<{ type: string; content?: string; [k: string]: unknown }>,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of generator()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`))
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
}

export function createChatRoutes(toolRegistry: ToolRegistry): Hono {
  const app = new Hono()

  /**
   * Normal chat — NO tools, just conversation.
   * For computer use, call POST /api/autonomous instead.
   */
  app.post('/chat', async (c) => {
    const body = await c.req.json<{
      message: string
      history?: ChatMessage[]
      model?: string
      useTools?: boolean
    }>()

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ error: 'message is required' }, 400)
    }

    const modelConfig = resolveModelConfig(body)
    const settings = loadSettings()
    const history = body.history || []

    // If useTools explicitly requested, use the tool loop
    if (body.useTools) {
      return sseStream(() =>
        toolUseLoop(body.message, history, modelConfig, toolRegistry),
      )
    }

    // Normal chat — just stream text, no tools
    return sseStream(async function* () {
      const messages: ChatMessage[] = [
        { role: 'system', content: settings.systemPrompt, timestamp: Date.now() },
        ...history,
        { role: 'user', content: body.message, timestamp: Date.now() },
      ]

      for await (const chunk of modelRouter.stream(modelConfig, messages)) {
        if (chunk.type === 'text') {
          yield { type: 'text', content: chunk.content }
        } else if (chunk.type === 'error') {
          yield { type: 'error', content: chunk.content }
        }
      }

      yield { type: 'done' }
    })
  })

  return app
}
