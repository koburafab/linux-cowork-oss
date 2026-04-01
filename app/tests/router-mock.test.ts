/**
 * Multi-model router tests with mocked fetch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ModelRouter } from '../src/core/models/router'
import type { ChatMessage, ModelConfig } from '../src/core/models/types'

// Helper: create a ReadableStream from SSE chunks
function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

// Helper configs
const openaiConfig: ModelConfig = {
  id: 'test-openai',
  name: 'Test OpenAI',
  provider: 'openai-compatible',
  model: 'gpt-test',
  baseUrl: 'http://fake-api.test',
  apiKey: 'sk-test-key',
}

const ollamaConfig: ModelConfig = {
  id: 'test-ollama',
  name: 'Test Ollama',
  provider: 'ollama',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',
}

const anthropicConfig: ModelConfig = {
  id: 'test-anthropic',
  name: 'Test Anthropic',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250514',
  apiKey: 'sk-ant-test',
}

const testMessages: ChatMessage[] = [
  { role: 'user', content: 'Hello', timestamp: Date.now() },
]

describe('ModelRouter - Mock fetch', () => {
  let router: ModelRouter
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    router = new ModelRouter()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // --- Non-streaming OpenAI-compatible ---

  it('should parse a standard OpenAI chat completion response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello back!' } }],
        model: 'gpt-test',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
      text: async () => '',
    })

    const result = await router.chat(openaiConfig, testMessages)

    expect(result.content).toBe('Hello back!')
    expect(result.model).toBe('gpt-test')
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
  })

  it('should send Authorization header when apiKey is provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        model: 'gpt-test',
      }),
      text: async () => '',
    })

    await router.chat(openaiConfig, testMessages)

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers.Authorization).toBe('Bearer sk-test-key')
  })

  it('should NOT send Authorization header when no apiKey (Ollama)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
        model: 'llama3.2',
      }),
      text: async () => '',
    })

    await router.chat(ollamaConfig, testMessages)

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers.Authorization).toBeUndefined()
  })

  // --- Error handling ---

  it('should throw on API 500 error (non-streaming)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    })

    await expect(router.chat(openaiConfig, testMessages)).rejects.toThrow(
      'API error 500: Internal Server Error',
    )
  })

  it('should yield error chunk on API 500 (streaming)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Rate limited',
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0].type).toBe('error')
    expect(chunks[0].content).toContain('500')
  })

  it('should handle empty choices gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [],
        model: 'gpt-test',
      }),
      text: async () => '',
    })

    const result = await router.chat(openaiConfig, testMessages)
    expect(result.content).toBe('')
  })

  // --- Streaming SSE parsing ---

  it('should parse SSE streaming chunks correctly', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n',
      'data: [DONE]\n\n',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: sseStream(sseData),
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    const textChunks = chunks.filter((c) => c.type === 'text')
    expect(textChunks).toHaveLength(3)
    expect(textChunks.map((c) => c.content).join('')).toBe('Hello world')
    expect(chunks[chunks.length - 1].type).toBe('done')
  })

  it('should handle SSE chunks split across read boundaries', async () => {
    // Simulate a chunk boundary in the middle of a data line
    const sseData = [
      'data: {"choices":[{"delta":{"con',
      'tent":"Hello"}}]}\n\ndata: [DONE]\n\n',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: sseStream(sseData),
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    const textChunks = chunks.filter((c) => c.type === 'text')
    expect(textChunks).toHaveLength(1)
    expect(textChunks[0].content).toBe('Hello')
  })

  it('should skip malformed JSON in SSE stream gracefully', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: {INVALID JSON}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
      'data: [DONE]\n\n',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: sseStream(sseData),
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    const textChunks = chunks.filter((c) => c.type === 'text')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].content).toBe('ok')
    expect(textChunks[1].content).toBe('!')
  })

  it('should handle empty delta content in SSE chunks', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"text"}}]}\n\n',
      'data: [DONE]\n\n',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: sseStream(sseData),
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    const textChunks = chunks.filter((c) => c.type === 'text')
    expect(textChunks).toHaveLength(1)
    expect(textChunks[0].content).toBe('text')
  })

  it('should emit done when stream ends without [DONE] marker', async () => {
    const sseData = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
    ]

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: sseStream(sseData),
    })

    const chunks: Array<{ type: string; content: string }> = []
    for await (const chunk of router.stream(openaiConfig, testMessages)) {
      chunks.push(chunk)
    }

    expect(chunks[chunks.length - 1].type).toBe('done')
  })

  // --- Anthropic message formatting ---

  describe('formatForAnthropic (via chat routing)', () => {
    it('should extract system messages from chat messages', () => {
      // Access private method through prototype
      const router2 = new ModelRouter()
      const format = (router2 as any).formatForAnthropic.bind(router2)

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helpful.', timestamp: 1 },
        { role: 'user', content: 'Hello', timestamp: 2 },
        { role: 'assistant', content: 'Hi!', timestamp: 3 },
      ]

      const { system, formatted } = format(messages)

      expect(system).toBe('You are helpful.')
      expect(formatted).toHaveLength(2)
      expect(formatted[0]).toEqual({ role: 'user', content: 'Hello' })
      expect(formatted[1]).toEqual({ role: 'assistant', content: 'Hi!' })
    })

    it('should concatenate multiple system messages', () => {
      const router2 = new ModelRouter()
      const format = (router2 as any).formatForAnthropic.bind(router2)

      const messages: ChatMessage[] = [
        { role: 'system', content: 'Rule 1', timestamp: 1 },
        { role: 'system', content: 'Rule 2', timestamp: 2 },
        { role: 'user', content: 'Go', timestamp: 3 },
      ]

      const { system, formatted } = format(messages)

      expect(system).toBe('Rule 1\nRule 2')
      expect(formatted).toHaveLength(1)
    })

    it('should handle messages with no system prompt', () => {
      const router2 = new ModelRouter()
      const format = (router2 as any).formatForAnthropic.bind(router2)

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: 1 },
      ]

      const { system, formatted } = format(messages)

      expect(system).toBe('')
      expect(formatted).toHaveLength(1)
    })
  })

  // --- Ollama uses OpenAI format ---

  describe('Ollama format', () => {
    it('should send messages in OpenAI format to Ollama endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Ollama response' } }],
          model: 'llama3.2',
        }),
        text: async () => '',
      })

      const messages: ChatMessage[] = [
        { role: 'system', content: 'Be brief', timestamp: 1 },
        { role: 'user', content: 'Hi', timestamp: 2 },
      ]

      await router.chat(ollamaConfig, messages)

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(call[1].body)

      // Ollama uses OpenAI format: system messages stay as-is
      expect(body.messages).toEqual([
        { role: 'system', content: 'Be brief' },
        { role: 'user', content: 'Hi' },
      ])
      expect(body.model).toBe('llama3.2')
      expect(call[0]).toBe('http://localhost:11434/v1/chat/completions')
    })

    it('should use default localhost:11434 when no baseUrl set', async () => {
      const configNoUrl: ModelConfig = {
        id: 'ollama-nourl',
        name: 'Ollama',
        provider: 'ollama',
        model: 'llama3.2',
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok' } }],
          model: 'llama3.2',
        }),
        text: async () => '',
      })

      await router.chat(configNoUrl, testMessages)

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(call[0]).toBe('http://localhost:11434/v1/chat/completions')
    })
  })
})
