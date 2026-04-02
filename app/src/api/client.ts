/**
 * API client for Hono backend (localhost:3001)
 * Streams chat via SSE, exposes status/settings/audit/screenshot endpoints
 */

const BACKEND_URL = 'http://localhost:3001'

// Types for SSE events from backend
export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'screenshot'; base64: string }
  | { type: 'error'; content: string }
  | { type: 'done' }

/**
 * Stream chat via SSE — POST to /api/chat, yields parsed events
 */
export async function* streamChat(message: string, options?: { useTools?: boolean }): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, useTools: options?.useTools }),
  })

  if (!res.ok) {
    yield { type: 'error', content: `Backend error: ${res.status} ${res.statusText}` }
    yield { type: 'done' }
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    yield { type: 'error', content: 'No response body' }
    yield { type: 'done' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep incomplete last line in buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { type: 'done' }
          return
        }

        try {
          const event = JSON.parse(data) as SSEEvent
          yield event
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/**
 * Get backend status
 */
export async function getStatus(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BACKEND_URL}/api/status`)
  return res.json()
}

/**
 * Take a screenshot via computer-use
 */
export async function takeScreenshot(): Promise<{ base64: string }> {
  const res = await fetch(`${BACKEND_URL}/api/computer-use/screenshot`, { method: 'POST' })
  return res.json()
}

/**
 * Get current settings
 */
export async function getSettings(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BACKEND_URL}/api/settings`)
  return res.json()
}

/**
 * Update settings
 */
export async function updateSettings(settings: Record<string, unknown>): Promise<void> {
  await fetch(`${BACKEND_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}

/**
 * Get audit log
 */
export async function getAudit(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BACKEND_URL}/api/audit`)
  return res.json()
}

// --- File history / undo ---

/**
 * Undo the last file modification (restore previous snapshot)
 */
export async function undoFile(path: string): Promise<{ ok: boolean; snapshot?: unknown; error?: string }> {
  const res = await fetch(`${BACKEND_URL}/api/undo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  return res.json()
}

/**
 * Get file history (all snapshots for a given path)
 */
export async function getFileHistory(path: string): Promise<{ path: string; snapshots: unknown[] }> {
  const encoded = encodeURIComponent(path)
  const res = await fetch(`${BACKEND_URL}/api/file-history/${encoded}`)
  return res.json()
}

// --- Conversations ---

export async function getConversations(): Promise<{ conversations: Array<{ id: number; title: string; model: string; created_at: string }> }> {
  const res = await fetch(`${BACKEND_URL}/api/conversations`)
  return res.json()
}

export async function createConversation(title: string, model: string): Promise<{ id: number }> {
  const res = await fetch(`${BACKEND_URL}/api/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model }),
  })
  return res.json()
}

export async function getConversationMessages(id: number): Promise<{ messages: Array<{ id: number; conversation_id: number; role: string; content: string; timestamp: number; model?: string }> }> {
  const res = await fetch(`${BACKEND_URL}/api/conversations/${id}/messages`)
  return res.json()
}

// --- Multi-agent ---

export interface SpawnAgentConfig {
  name: string
  model?: string
  systemPrompt?: string
  task: string
}

export interface AgentInfo {
  id: string
  name: string
  status: 'running' | 'done' | 'failed'
  task: string
  createdAt: number
}

/**
 * Spawn a new agent
 */
export async function spawnAgent(config: SpawnAgentConfig): Promise<{ id: string; name: string; status: string }> {
  const res = await fetch(`${BACKEND_URL}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return res.json()
}

/**
 * List all active agents
 */
export async function listAgents(): Promise<{ agents: AgentInfo[] }> {
  const res = await fetch(`${BACKEND_URL}/api/agents`)
  return res.json()
}

/**
 * Get a specific agent with history
 */
export async function getAgent(id: string): Promise<AgentInfo & { history: unknown[] }> {
  const res = await fetch(`${BACKEND_URL}/api/agents/${encodeURIComponent(id)}`)
  return res.json()
}

/**
 * Kill an agent
 */
export async function killAgent(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/agents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return res.json()
}

/**
 * Poll /api/status until backend responds — returns true if ready
 */
export async function waitForBackend(maxRetries = 30, intervalMs = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`)
      if (res.ok) return true
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}
