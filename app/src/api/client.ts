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
