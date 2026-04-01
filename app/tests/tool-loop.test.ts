import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toolUseLoop, type SSEEvent } from '../src/backend/tool-loop'
import { ToolRegistry } from '../src/backend/tool-registry'
import type { ModelConfig, StreamChunk } from '../src/core/models/types'

// Create a mock router (injected, not vi.mock to avoid polluting other tests)
const mockStream = vi.fn()
const mockRouter = {
  stream: mockStream,
  chat: vi.fn(),
} as any

function makeConfig(): ModelConfig {
  return {
    id: 'test',
    name: 'Test Model',
    provider: 'anthropic',
    model: 'test-model',
    apiKey: 'test-key',
  }
}

function makeRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register({
    definition: {
      name: 'test_tool',
      description: 'A test tool',
      input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
    executor: async (input) => `Result for: ${input.query}`,
  })
  return registry
}

async function collectEvents(gen: AsyncGenerator<SSEEvent>): Promise<SSEEvent[]> {
  const events: SSEEvent[] = []
  for await (const event of gen) {
    events.push(event)
  }
  return events
}

describe('toolUseLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should yield text chunks and done when model returns text only', async () => {
    async function* fakeStream(): AsyncGenerator<StreamChunk> {
      yield { type: 'text', content: 'Hello ' }
      yield { type: 'text', content: 'world' }
      yield { type: 'done', content: '' }
    }
    mockStream.mockReturnValue(fakeStream())

    const events = await collectEvents(
      toolUseLoop('hi', [], makeConfig(), makeRegistry(), { router: mockRouter }),
    )

    const textEvents = events.filter((e) => e.type === 'text')
    expect(textEvents).toHaveLength(2)
    expect(textEvents[0].content).toBe('Hello ')
    expect(textEvents[1].content).toBe('world')

    const doneEvents = events.filter((e) => e.type === 'done')
    expect(doneEvents).toHaveLength(1)
  })

  it('should execute tools and reboucle when model requests tool_use', async () => {
    let callCount = 0

    mockStream.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: model wants to use a tool
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'text', content: 'Let me check...' }
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'test_tool',
            toolInput: { query: 'test' },
            toolUseId: 'tu_123',
          }
          yield { type: 'done', content: '' }
        })()
      }
      // Second call: model returns final text
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'Done!' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), { router: mockRouter }),
    )

    const types = events.map((e) => e.type)
    expect(types).toContain('text')
    expect(types).toContain('tool_call')
    expect(types).toContain('tool_result')
    expect(types).toContain('done')

    const toolCall = events.find((e) => e.type === 'tool_call')
    expect(toolCall?.name).toBe('test_tool')
    expect(toolCall?.input).toEqual({ query: 'test' })

    const toolResult = events.find((e) => e.type === 'tool_result')
    expect(toolResult?.result).toBe('Result for: test')
  })

  it('should respect max iterations', async () => {
    // Model always requests tool_use — should stop after maxIterations
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield {
          type: 'tool_use',
          content: '',
          toolName: 'test_tool',
          toolInput: { query: 'loop' },
          toolUseId: 'tu_loop',
        }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), {
        maxIterations: 3,
        router: mockRouter,
      }),
    )

    // Should have 3 tool_call events (one per iteration)
    const toolCalls = events.filter((e) => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(3)

    // Should end with error about max iterations
    const last = events[events.length - 1]
    expect(last.type).toBe('error')
    expect(last.content).toContain('Max iterations')
  })

  it('should yield error when model stream throws', async () => {
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        throw new Error('API failure')
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), { router: mockRouter }),
    )

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.content).toContain('API failure')
  })

  it('should handle unknown tool gracefully', async () => {
    let callCount = 0

    mockStream.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'nonexistent_tool',
            toolInput: {},
            toolUseId: 'tu_unknown',
          }
          yield { type: 'done', content: '' }
        })()
      }
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'OK' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), { router: mockRouter }),
    )

    const toolResult = events.find((e) => e.type === 'tool_result')
    expect(toolResult).toBeDefined()
    expect(toolResult?.result).toContain('unknown tool')
  })

  it('should handle timeout', async () => {
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield {
          type: 'tool_use',
          content: '',
          toolName: 'test_tool',
          toolInput: { query: 'slow' },
          toolUseId: 'tu_slow',
        }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), {
        timeoutMs: 0, // immediately timed out
        router: mockRouter,
      }),
    )

    // With timeoutMs=0, the first iteration runs (timeout checked at start of each
    // iteration), but the second iteration is blocked by timeout
    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.content).toContain('timeout')
  })
})
