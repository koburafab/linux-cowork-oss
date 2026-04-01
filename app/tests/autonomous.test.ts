import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toolUseLoop, type SSEEvent } from '../src/backend/tool-loop'
import { ToolRegistry } from '../src/backend/tool-registry'
import type { ModelConfig, StreamChunk, ContentBlock } from '../src/core/models/types'

// Mock router — injected, not vi.mock
const mockStream = vi.fn()
const mockRouter = {
  stream: mockStream,
  chat: vi.fn(),
} as any

function makeConfig(provider: 'anthropic' | 'openai-compatible' = 'openai-compatible'): ModelConfig {
  return {
    id: 'test',
    name: 'Test Model',
    provider,
    model: 'test-model',
    apiKey: 'test-key',
    baseUrl: 'https://api.deepseek.com',
  }
}

function makeRegistryWithScreenshot(): ToolRegistry {
  const registry = new ToolRegistry()

  registry.register({
    definition: {
      name: 'screenshot',
      description: 'Take a screenshot',
      input_schema: { type: 'object', properties: {}, required: [] },
    },
    executor: async (): Promise<ContentBlock[]> => {
      return [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: 'fakebase64screenshotdata',
          },
        },
      ]
    },
  })

  registry.register({
    definition: {
      name: 'click',
      description: 'Click at coordinates',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['x', 'y'],
      },
    },
    executor: async (input) => `Clicked at (${input.x}, ${input.y})`,
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

describe('Autonomous tool-use loop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute screenshot tool and return base64 in screenshot event', async () => {
    let callCount = 0

    mockStream.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: model requests screenshot
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'text', content: 'Let me take a screenshot.' }
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'screenshot',
            toolInput: {},
            toolUseId: 'call_screenshot_1',
          }
          yield { type: 'done', content: '' }
        })()
      }
      // Second call: model responds with text after seeing the screenshot
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'I see the desktop. Task complete.' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop(
        'Take a screenshot and describe what you see',
        [],
        makeConfig(),
        makeRegistryWithScreenshot(),
        { router: mockRouter },
      ),
    )

    const types = events.map((e) => e.type)

    // Should have: text, tool_call, screenshot, tool_result, text, done
    expect(types).toContain('text')
    expect(types).toContain('tool_call')
    expect(types).toContain('screenshot')
    expect(types).toContain('tool_result')
    expect(types).toContain('done')

    // Verify screenshot event has base64
    const screenshotEvent = events.find((e) => e.type === 'screenshot')
    expect(screenshotEvent?.base64).toBe('fakebase64screenshotdata')

    // Verify tool_call event
    const toolCallEvent = events.find((e) => e.type === 'tool_call')
    expect(toolCallEvent?.name).toBe('screenshot')
  })

  it('should emit done after model returns text without tool calls', async () => {
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'All done!' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop(
        'simple task',
        [],
        makeConfig(),
        makeRegistryWithScreenshot(),
        { router: mockRouter },
      ),
    )

    const last = events[events.length - 1]
    expect(last.type).toBe('done')
  })

  it('should format tool results as OpenAI role:tool for openai-compatible provider', async () => {
    let secondCallMessages: any[] = []
    let callCount = 0

    mockStream.mockImplementation((_config: any, messages: any[]) => {
      callCount++
      if (callCount === 1) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'click',
            toolInput: { x: 100, y: 200 },
            toolUseId: 'call_click_1',
          }
          yield { type: 'done', content: '' }
        })()
      }
      // Capture messages on second call to verify format
      secondCallMessages = JSON.parse(JSON.stringify(messages))
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'Clicked.' }
        yield { type: 'done', content: '' }
      })()
    })

    await collectEvents(
      toolUseLoop(
        'click somewhere',
        [],
        makeConfig('openai-compatible'),
        makeRegistryWithScreenshot(),
        { router: mockRouter },
      ),
    )

    // Find the tool result message in the second call's messages
    const toolMsg = secondCallMessages.find((m: any) => m.role === 'tool')
    expect(toolMsg).toBeDefined()
    expect(toolMsg.tool_call_id).toBe('call_click_1')
    expect(toolMsg.content).toContain('Clicked at (100, 200)')

    // Find the assistant message with tool_calls
    const assistantMsg = secondCallMessages.find(
      (m: any) => m.role === 'assistant' && m.tool_calls,
    )
    expect(assistantMsg).toBeDefined()
    expect(assistantMsg.tool_calls).toHaveLength(1)
    expect(assistantMsg.tool_calls[0].function.name).toBe('click')
  })

  it('should format tool results as Anthropic format for anthropic provider', async () => {
    let secondCallMessages: any[] = []
    let callCount = 0

    mockStream.mockImplementation((_config: any, messages: any[]) => {
      callCount++
      if (callCount === 1) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'click',
            toolInput: { x: 50, y: 75 },
            toolUseId: 'toolu_abc',
          }
          yield { type: 'done', content: '' }
        })()
      }
      secondCallMessages = JSON.parse(JSON.stringify(messages))
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'Done.' }
        yield { type: 'done', content: '' }
      })()
    })

    await collectEvents(
      toolUseLoop(
        'click task',
        [],
        makeConfig('anthropic'),
        makeRegistryWithScreenshot(),
        { router: mockRouter },
      ),
    )

    // For Anthropic, tool results should be in user messages with tool_result content
    const toolResultMsg = secondCallMessages.find(
      (m: any) => m.role === 'user' && typeof m.content === 'string' && m.content.includes('tool_result'),
    )
    expect(toolResultMsg).toBeDefined()
    const parsed = JSON.parse(toolResultMsg.content)
    expect(parsed[0].type).toBe('tool_result')
    expect(parsed[0].tool_use_id).toBe('toolu_abc')

    // Assistant message should NOT have tool_calls for Anthropic
    const assistantMsg = secondCallMessages.find((m: any) => m.role === 'assistant')
    expect(assistantMsg).toBeDefined()
    expect(assistantMsg.tool_calls).toBeUndefined()
  })

  it('should handle multi-step tool loop (screenshot then click then screenshot)', async () => {
    let callCount = 0

    mockStream.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'text', content: 'Taking screenshot...' }
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'screenshot',
            toolInput: {},
            toolUseId: 'call_ss1',
          }
        })()
      }
      if (callCount === 2) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'text', content: 'I see a button. Clicking...' }
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'click',
            toolInput: { x: 500, y: 300 },
            toolUseId: 'call_click1',
          }
        })()
      }
      if (callCount === 3) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield { type: 'text', content: 'Verifying...' }
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'screenshot',
            toolInput: {},
            toolUseId: 'call_ss2',
          }
        })()
      }
      // Final response
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'Task complete.' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop(
        'Click the button',
        [],
        makeConfig(),
        makeRegistryWithScreenshot(),
        { router: mockRouter, maxIterations: 10 },
      ),
    )

    const toolCalls = events.filter((e) => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(3) // screenshot, click, screenshot

    const screenshots = events.filter((e) => e.type === 'screenshot')
    expect(screenshots).toHaveLength(2)

    const doneEvents = events.filter((e) => e.type === 'done')
    expect(doneEvents).toHaveLength(1)
  })
})
