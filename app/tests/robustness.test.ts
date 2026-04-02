/**
 * Robustness tests — error handling, edge cases, 404s
 * No vi.mock — tests modules directly or uses injected fakes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toolUseLoop, type SSEEvent } from '../src/backend/tool-loop'
import { ToolRegistry } from '../src/backend/tool-registry'
import type { ModelConfig, StreamChunk } from '../src/core/models/types'

// --- Helpers ---

const mockStream = vi.fn()
const mockRouter = {
  stream: mockStream,
  chat: vi.fn(),
} as any

function makeConfig(overrides?: Partial<ModelConfig>): ModelConfig {
  return {
    id: 'test',
    name: 'Test Model',
    provider: 'anthropic',
    model: 'test-model',
    apiKey: 'test-key',
    ...overrides,
  }
}

function makeRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register({
    definition: {
      name: 'echo',
      description: 'Echo input',
      input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    },
    executor: async (input) => `echo: ${input.text}`,
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

// --- 1. Chat error on invalid model config ---

describe('Robustness: chat error on invalid model config', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should yield error event when model router throws (simulating invalid config)', async () => {
    // Router throws when streaming — simulates bad API key, wrong provider, etc.
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        throw new Error('Invalid API key or model configuration')
      })()
    })

    const events = await collectEvents(
      toolUseLoop('hello', [], makeConfig(), makeRegistry(), { router: mockRouter }),
    )

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.content).toContain('Invalid API key or model configuration')
    // Should NOT have a 'done' event — error terminates early
    const doneEvents = events.filter((e) => e.type === 'done')
    expect(doneEvents).toHaveLength(0)
  })

  it('should yield error when router stream yields an error chunk', async () => {
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'error', content: 'Model not found: fake-model-v99' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig({ model: 'fake-model-v99' }), makeRegistry(), { router: mockRouter }),
    )

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.content).toContain('fake-model-v99')
  })
})

// --- 2. Tool-loop stops after max iterations ---

describe('Robustness: tool-loop max iterations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should stop after exactly maxIterations and emit max-iterations error', async () => {
    // Model always requests a tool call — never finishes naturally
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield {
          type: 'tool_use',
          content: '',
          toolName: 'echo',
          toolInput: { text: 'infinite' },
          toolUseId: 'tu_inf',
        }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('loop forever', [], makeConfig(), makeRegistry(), {
        maxIterations: 2,
        router: mockRouter,
      }),
    )

    const toolCalls = events.filter((e) => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(2)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('error')
    expect(lastEvent.content).toContain('Max iterations')
  })

  it('should stop at maxIterations=1', async () => {
    mockStream.mockImplementation(() => {
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield {
          type: 'tool_use',
          content: '',
          toolName: 'echo',
          toolInput: { text: 'once' },
          toolUseId: 'tu_once',
        }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), makeRegistry(), {
        maxIterations: 1,
        router: mockRouter,
      }),
    )

    const toolCalls = events.filter((e) => e.type === 'tool_call')
    expect(toolCalls).toHaveLength(1)

    const lastEvent = events[events.length - 1]
    expect(lastEvent.type).toBe('error')
    expect(lastEvent.content).toContain('Max iterations')
  })
})

// --- 3. Tool-loop handles executor that throws ---

describe('Robustness: tool executor throws', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should catch tool executor error and continue loop', async () => {
    const registry = new ToolRegistry()
    registry.register({
      definition: {
        name: 'crash_tool',
        description: 'Always throws',
        input_schema: { type: 'object', properties: {}, required: [] },
      },
      executor: async () => {
        throw new Error('executor exploded')
      },
    })

    let callCount = 0
    mockStream.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return (async function* (): AsyncGenerator<StreamChunk> {
          yield {
            type: 'tool_use',
            content: '',
            toolName: 'crash_tool',
            toolInput: {},
            toolUseId: 'tu_crash',
          }
          yield { type: 'done', content: '' }
        })()
      }
      // Second call: model finishes after seeing error
      return (async function* (): AsyncGenerator<StreamChunk> {
        yield { type: 'text', content: 'OK recovered' }
        yield { type: 'done', content: '' }
      })()
    })

    const events = await collectEvents(
      toolUseLoop('test', [], makeConfig(), registry, { router: mockRouter }),
    )

    // Should have a tool_result with the error message
    const toolResult = events.find((e) => e.type === 'tool_result')
    expect(toolResult).toBeDefined()
    expect(String(toolResult?.result)).toContain('executor exploded')

    // Should still reach done (loop recovered)
    const doneEvent = events.find((e) => e.type === 'done')
    expect(doneEvent).toBeDefined()
  })
})

// --- 4. API /api/chat returns 400 without message ---
// --- 5. API /api/autonomous returns 400 without task ---
// --- 6. Routes return 404 for non-existent IDs ---

// These tests use Hono's app.request() directly — no mocking needed for validation logic.
// We need the server, which imports heavy deps. We replicate the backend.test.ts approach
// but only for the specific routes we test (agents, conversations).

describe('Robustness: API validation (Hono app.request)', () => {
  // We import createServer which triggers module-level imports.
  // The agents and conversations routes are lightweight enough to test directly.
  // For /api/chat and /api/autonomous, we test the Hono route validation only.

  // --- Agent routes (no DB dependency) ---

  it('GET /api/agents/fake should return 404', async () => {
    // Import the agent route creator directly — no mocks needed
    const { createAgentRoutes } = await import('../src/backend/routes/agents')
    const { Hono } = await import('hono')
    const app = new Hono()
    app.route('/api', createAgentRoutes())

    const res = await app.request('/api/agents/fake-nonexistent-id')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('not found')
  })

  it('DELETE /api/agents/fake should return 404', async () => {
    const { createAgentRoutes } = await import('../src/backend/routes/agents')
    const { Hono } = await import('hono')
    const app = new Hono()
    app.route('/api', createAgentRoutes())

    const res = await app.request('/api/agents/fake-nonexistent-id', { method: 'DELETE' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toContain('not found')
  })

  it('POST /api/agents/:id/message for fake agent should return 404', async () => {
    const { createAgentRoutes } = await import('../src/backend/routes/agents')
    const { Hono } = await import('hono')
    const app = new Hono()
    app.route('/api', createAgentRoutes())

    const res = await app.request('/api/agents/fake-nonexistent-id/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  // --- Conversation routes (uses SQLite — getMessages returns [] for nonexistent IDs) ---

  it('GET /api/conversations/99999/messages should not crash (returns 200 or 500)', async () => {
    const { createConversationRoutes } = await import('../src/backend/routes/conversations')
    const { Hono } = await import('hono')
    const app = new Hono()
    app.route('/api', createConversationRoutes())

    const res = await app.request('/api/conversations/99999/messages')
    // Route handles gracefully: either returns empty messages (200) or error (500)
    expect([200, 500]).toContain(res.status)
    const body = await res.json()
    if (res.status === 200) {
      expect(body.messages).toBeDefined()
      expect(Array.isArray(body.messages)).toBe(true)
    } else {
      // 500 with error message — route caught the error and returned JSON
      expect(body.error).toBeDefined()
    }
  })

  it('GET /api/conversations/not-a-number/messages should return 400', async () => {
    const { createConversationRoutes } = await import('../src/backend/routes/conversations')
    const { Hono } = await import('hono')
    const app = new Hono()
    app.route('/api', createConversationRoutes())

    const res = await app.request('/api/conversations/not-a-number/messages')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('invalid')
  })

  // --- Chat route validation (needs loadSettings + db mocks — test via tool-loop instead) ---
  // The /api/chat 400 validation is already covered in backend.test.ts.
  // We add an explicit test here using the chat route directly.

  it('POST /api/chat without message should return 400', async () => {
    // Create a minimal chat route with a dummy registry
    const { createChatRoutes } = await import('../src/backend/routes/chat')
    const { Hono } = await import('hono')
    const registry = makeRegistry()
    const app = new Hono()
    app.route('/api', createChatRoutes(registry))

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('message')
  })

  it('POST /api/chat with empty string message should return 400', async () => {
    const { createChatRoutes } = await import('../src/backend/routes/chat')
    const { Hono } = await import('hono')
    const registry = makeRegistry()
    const app = new Hono()
    app.route('/api', createChatRoutes(registry))

    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/autonomous without task should return 400', async () => {
    const { createAutonomousRoutes } = await import('../src/backend/routes/autonomous')
    const { Hono } = await import('hono')
    const registry = makeRegistry()
    const app = new Hono()
    app.route('/api', createAutonomousRoutes(registry))

    const res = await app.request('/api/autonomous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('task')
  })

  it('POST /api/autonomous with empty string task should return 400', async () => {
    const { createAutonomousRoutes } = await import('../src/backend/routes/autonomous')
    const { Hono } = await import('hono')
    const registry = makeRegistry()
    const app = new Hono()
    app.route('/api', createAutonomousRoutes(registry))

    const res = await app.request('/api/autonomous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: '' }),
    })
    expect(res.status).toBe(400)
  })
})
