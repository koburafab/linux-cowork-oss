/**
 * Multi-model router
 * Routes requests to the appropriate provider (Anthropic, Ollama, OpenAI-compatible)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ModelConfig, ChatMessage, StreamChunk, ModelResponse } from './types'

export class ModelRouter {
  private anthropicClients: Map<string, Anthropic> = new Map()

  async chat(
    config: ModelConfig,
    messages: ChatMessage[],
  ): Promise<ModelResponse> {
    switch (config.provider) {
      case 'anthropic':
        return this.chatAnthropic(config, messages)
      case 'ollama':
      case 'openai-compatible':
        return this.chatOpenAICompatible(config, messages)
      default:
        throw new Error(`Unknown provider: ${config.provider}`)
    }
  }

  async *stream(
    config: ModelConfig,
    messages: ChatMessage[],
  ): AsyncGenerator<StreamChunk> {
    switch (config.provider) {
      case 'anthropic':
        yield* this.streamAnthropic(config, messages)
        break
      case 'ollama':
      case 'openai-compatible':
        yield* this.streamOpenAICompatible(config, messages)
        break
      default:
        throw new Error(`Unknown provider: ${config.provider}`)
    }
  }

  // --- Anthropic ---

  private getAnthropicClient(config: ModelConfig): Anthropic {
    const key = config.apiKey || 'default'
    if (!this.anthropicClients.has(key)) {
      this.anthropicClients.set(
        key,
        new Anthropic({ apiKey: config.apiKey }),
      )
    }
    return this.anthropicClients.get(key)!
  }

  private async chatAnthropic(
    config: ModelConfig,
    messages: ChatMessage[],
  ): Promise<ModelResponse> {
    const client = this.getAnthropicClient(config)
    const { system, formatted } = this.formatForAnthropic(messages)

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      system: system || undefined,
      messages: formatted,
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return {
      content: text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason || undefined,
    }
  }

  private async *streamAnthropic(
    config: ModelConfig,
    messages: ChatMessage[],
  ): AsyncGenerator<StreamChunk> {
    const client = this.getAnthropicClient(config)
    const { system, formatted } = this.formatForAnthropic(messages)

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature,
      system: system || undefined,
      messages: formatted,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text', content: event.delta.text }
      }
    }

    yield { type: 'done', content: '' }
  }

  private formatForAnthropic(messages: ChatMessage[]): {
    system: string
    formatted: Array<{ role: 'user' | 'assistant'; content: string }>
  } {
    let system = ''
    const formatted: Array<{ role: 'user' | 'assistant'; content: string }> = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        system += (system ? '\n' : '') + msg.content
      } else {
        formatted.push({ role: msg.role, content: msg.content })
      }
    }

    return { system, formatted }
  }

  // --- OpenAI Compatible (Ollama, Grok, etc.) ---

  private async chatOpenAICompatible(
    config: ModelConfig,
    messages: ChatMessage[],
  ): Promise<ModelResponse> {
    const baseUrl = config.baseUrl || 'http://localhost:11434'
    const url = `${baseUrl}/v1/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${await response.text()}`)
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
      model: string
      usage?: { prompt_tokens: number; completion_tokens: number }
    }

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
          }
        : undefined,
    }
  }

  private async *streamOpenAICompatible(
    config: ModelConfig,
    messages: ChatMessage[],
  ): AsyncGenerator<StreamChunk> {
    const baseUrl = config.baseUrl || 'http://localhost:11434'
    const url = `${baseUrl}/v1/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      yield {
        type: 'error',
        content: `API error ${response.status}: ${await response.text()}`,
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          yield { type: 'done', content: '' }
          return
        }
        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string } }>
          }
          const content = parsed.choices[0]?.delta?.content
          if (content) {
            yield { type: 'text', content }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    yield { type: 'done', content: '' }
  }
}

// Singleton
export const modelRouter = new ModelRouter()
