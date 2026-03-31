import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../src/stores/chatStore'
import { QueryEngine } from '../src/core/engine'
import type { ModelConfig, ChatMessage, StreamChunk, ModelResponse } from '../src/core/models/types'

/**
 * Fake ModelRouter for testing — records calls and yields configurable chunks
 */
class FakeRouter {
  calls: Array<{ config: ModelConfig; messages: ChatMessage[] }> = []
  private streamFn: () => AsyncGenerator<StreamChunk> = async function* () {
    yield { type: 'text', content: 'ok' }
    yield { type: 'done', content: '' }
  }

  setStreamFn(fn: () => AsyncGenerator<StreamChunk>) {
    this.streamFn = fn
  }

  stream(config: ModelConfig, messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
    this.calls.push({ config, messages })
    return this.streamFn()
  }

  async chat(config: ModelConfig, messages: ChatMessage[]): Promise<ModelResponse> {
    this.calls.push({ config, messages })
    return { content: 'ok', model: 'test' }
  }
}

describe('QueryEngine', () => {
  let engine: QueryEngine
  let fakeRouter: FakeRouter

  beforeEach(() => {
    fakeRouter = new FakeRouter()
    // Cast is safe — FakeRouter implements the same interface
    engine = new QueryEngine(fakeRouter as any)
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      auditLog: [],
    })
  })

  it('should add user message to store on sendMessage', async () => {
    fakeRouter.setStreamFn(async function* () {
      yield { type: 'text', content: 'Hello!' }
      yield { type: 'done', content: '' }
    })

    await engine.sendMessage('Hi there')

    const state = useChatStore.getState()
    expect(state.messages).toHaveLength(2) // user + assistant
    expect(state.messages[0].role).toBe('user')
    expect(state.messages[0].content).toBe('Hi there')
  })

  it('should accumulate streamed chunks into assistant message', async () => {
    fakeRouter.setStreamFn(async function* () {
      yield { type: 'text', content: 'Part 1 ' }
      yield { type: 'text', content: 'Part 2' }
      yield { type: 'done', content: '' }
    })

    const result = await engine.sendMessage('test')

    expect(result).toBe('Part 1 Part 2')
    const state = useChatStore.getState()
    expect(state.messages[1].role).toBe('assistant')
    expect(state.messages[1].content).toBe('Part 1 Part 2')
  })

  it('should set streaming flag during execution', async () => {
    let wasStreaming = false

    fakeRouter.setStreamFn(async function* () {
      wasStreaming = useChatStore.getState().isStreaming
      yield { type: 'text', content: 'ok' }
      yield { type: 'done', content: '' }
    })

    await engine.sendMessage('test')

    expect(wasStreaming).toBe(true)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('should add audit entries for user and assistant messages', async () => {
    fakeRouter.setStreamFn(async function* () {
      yield { type: 'text', content: 'response' }
      yield { type: 'done', content: '' }
    })

    await engine.sendMessage('hello')

    const audit = useChatStore.getState().auditLog
    expect(audit.length).toBeGreaterThanOrEqual(2)
    expect(audit[0].action).toBe('chat:user')
    expect(audit[1].action).toBe('chat:assistant')
  })

  it('should throw on stream error and log it', async () => {
    fakeRouter.setStreamFn(async function* () {
      yield { type: 'error', content: 'API rate limited' }
    })

    await expect(engine.sendMessage('test')).rejects.toThrow('API rate limited')
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('should pass system prompt and history to router', async () => {
    fakeRouter.setStreamFn(async function* () {
      yield { type: 'text', content: 'ok' }
      yield { type: 'done', content: '' }
    })

    await engine.sendMessage('hello')

    expect(fakeRouter.calls).toHaveLength(1)
    const messages = fakeRouter.calls[0].messages
    // First message should be system prompt
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('helpful AI assistant')
    // Second should be the user message
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toBe('hello')
  })

  it('stop() should abort the controller', async () => {
    let resolveStream!: () => void
    const streamPromise = new Promise<void>((r) => { resolveStream = r })

    fakeRouter.setStreamFn(async function* () {
      yield { type: 'text', content: 'start' }
      await streamPromise
      yield { type: 'text', content: ' end' }
      yield { type: 'done', content: '' }
    })

    const sendPromise = engine.sendMessage('test')

    // Give the engine time to start streaming
    await new Promise((r) => setTimeout(r, 10))
    engine.stop()
    resolveStream()

    const result = await sendPromise
    expect(result).toBe('start')
  })
})
