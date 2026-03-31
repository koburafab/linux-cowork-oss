/**
 * Query Engine — conversation loop connecting ModelRouter to ChatStore
 */

import { modelRouter, type ModelRouter } from './models/router'
import { useChatStore } from '../stores/chatStore'
import type { ChatMessage } from './models/types'

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant running on Linux. You can see the screen, control mouse/keyboard, and manage files.'

export class QueryEngine {
  private abortController: AbortController | null = null
  private router: ModelRouter

  constructor(router?: ModelRouter) {
    this.router = router || modelRouter
  }

  /**
   * Send a user message and stream the assistant response
   */
  async sendMessage(content: string): Promise<string> {
    const store = useChatStore.getState()

    // 1. Add user message to store
    const userMsg: ChatMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    store.addMessage(userMsg)
    store.addAuditEntry('chat:user', `User message: ${content.slice(0, 100)}`)

    // 2. Compile context (system prompt + history)
    const systemPrompt = DEFAULT_SYSTEM_PROMPT
    const messages = this.buildContext(systemPrompt, useChatStore.getState().messages)

    // 3. Stream with the active model
    const model = store.activeModel
    store.setStreaming(true)
    this.abortController = new AbortController()

    let accumulated = ''

    try {
      const stream = this.router.stream(model, messages)

      for await (const chunk of stream) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          break
        }

        if (chunk.type === 'text') {
          accumulated += chunk.content
        } else if (chunk.type === 'error') {
          store.addAuditEntry('chat:error', chunk.content)
          throw new Error(chunk.content)
        } else if (chunk.type === 'done') {
          break
        }
      }

      // 4. Add final assistant message to store
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: accumulated,
        timestamp: Date.now(),
        model: model.name,
      }
      store.addMessage(assistantMsg)

      // 5. Log in audit trail
      store.addAuditEntry(
        'chat:assistant',
        `Response from ${model.name}: ${accumulated.slice(0, 100)}`,
      )

      return accumulated
    } finally {
      store.setStreaming(false)
      this.abortController = null
    }
  }

  /**
   * Stop the current streaming response
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
      useChatStore.getState().setStreaming(false)
    }
  }

  /**
   * Build the full message context for the model
   */
  private buildContext(systemPrompt: string, history: ChatMessage[]): ChatMessage[] {
    const systemMsg: ChatMessage = {
      role: 'system',
      content: systemPrompt,
      timestamp: 0,
    }
    return [systemMsg, ...history]
  }
}

export const queryEngine = new QueryEngine()
