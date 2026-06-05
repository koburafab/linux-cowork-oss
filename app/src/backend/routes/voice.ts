/**
 * Voice route — POST /api/voice/transcribe : records the mic and returns text.
 * Reuses the `voice_transcribe` tool (records via pw-record + OpenAI transcription).
 */

import { Hono } from 'hono'
import type { ToolRegistry } from '../tool-registry'

export function createVoiceRoutes(registry: ToolRegistry): Hono {
  const app = new Hono()

  app.post('/voice/transcribe', async (c) => {
    const body = await c.req
      .json<{ seconds?: number }>()
      .catch(() => ({}) as { seconds?: number })

    const tool = registry.get('voice_transcribe')
    if (!tool) {
      return c.json({ error: 'voice_transcribe tool not available' }, 500)
    }

    const result = await tool.executor({ seconds: body.seconds ?? 5 })
    const text = typeof result === 'string' ? result : ''
    if (!text || text.startsWith('Error')) {
      return c.json({ error: text || 'transcription failed' }, 400)
    }
    return c.json({ text })
  })

  return app
}
