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
import {
  saveConversation,
  saveMessage,
  getMessages,
  getMemories,
} from '../../core/memory/db'

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
  } else if (config.baseUrl?.includes('moonshot.ai') || config.baseUrl?.includes('moonshot.cn')) {
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
      conversationId?: number
    }>()

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ error: 'message is required' }, 400)
    }

    const modelConfig = resolveModelConfig(body)
    const settings = loadSettings()

    // Create or reuse conversation
    let conversationId = body.conversationId ?? null
    if (!conversationId) {
      const title = body.message.slice(0, 80)
      conversationId = saveConversation({
        title,
        model: modelConfig.id || modelConfig.name,
      })
    }

    // Build history: prefer DB history if conversationId existed, else body.history
    let history = body.history || []
    if (body.conversationId) {
      const dbMessages = getMessages(body.conversationId)
      if (dbMessages.length > 0) {
        history = dbMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      }
    }

    // Save user message to DB
    saveMessage({
      conversation_id: conversationId,
      role: 'user',
      content: body.message,
      timestamp: Date.now(),
      model: modelConfig.id || modelConfig.name,
    })

    // Build system prompt with injected memories
    let systemPrompt = settings.systemPrompt
    try {
      const memories = getMemories()
      if (memories.length > 0) {
        const memoryBlock = memories.map((m) => `- ${m.content}`).join('\n')
        systemPrompt += `\n\n## Things I remember:\n${memoryBlock}`
      }
    } catch {
      // memories not available — continue without them
    }

    const finalConvId = conversationId

    // If useTools explicitly requested, use the tool loop
    if (body.useTools) {
      return sseStream(async function* () {
        let fullAssistantText = ''
        for await (const event of toolUseLoop(body.message, history, modelConfig, toolRegistry, { systemPrompt })) {
          if (event.type === 'text' && event.content) {
            fullAssistantText += event.content
          }
          yield event
          // When done, persist the assistant message
          if (event.type === 'done' && fullAssistantText) {
            saveMessage({
              conversation_id: finalConvId,
              role: 'assistant',
              content: fullAssistantText,
              timestamp: Date.now(),
              model: modelConfig.id || modelConfig.name,
            })
          }
        }
      })
    }

    // Normal chat — just stream text, no tools
    return sseStream(async function* () {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt, timestamp: Date.now() },
        ...history,
        { role: 'user', content: body.message, timestamp: Date.now() },
      ]

      let fullAssistantText = ''

      for await (const chunk of modelRouter.stream(modelConfig, messages)) {
        if (chunk.type === 'text') {
          fullAssistantText += chunk.content || ''
          yield { type: 'text', content: chunk.content }
        } else if (chunk.type === 'error') {
          yield { type: 'error', content: chunk.content }
        }
      }

      // Persist assistant response
      if (fullAssistantText) {
        saveMessage({
          conversation_id: finalConvId,
          role: 'assistant',
          content: fullAssistantText,
          timestamp: Date.now(),
          model: modelConfig.id || modelConfig.name,
        })
      }

      yield { type: 'done', conversationId: finalConvId }
    })
  })

  return app
}
