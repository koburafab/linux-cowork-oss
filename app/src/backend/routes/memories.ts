/**
 * Memory routes — CRUD for persistent memories
 */

import { Hono } from 'hono'
import { saveMemory, getMemories, deleteMemory } from '../../core/memory/db'
import type { Memory } from '../../core/memory/db'

export function createMemoryRoutes(): Hono {
  const app = new Hono()

  /** List all memories, optionally filtered by type */
  app.get('/memories', (c) => {
    try {
      const type = c.req.query('type') as Memory['type'] | undefined
      const memories = getMemories(type)
      return c.json({ memories })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Save a new memory */
  app.post('/memories', async (c) => {
    try {
      const body = await c.req.json<{
        type?: Memory['type']
        name?: string
        content: string
      }>()
      if (!body.content) {
        return c.json({ error: 'content is required' }, 400)
      }
      const id = saveMemory({
        type: body.type || 'user',
        name: body.name || 'memory',
        content: body.content,
      })
      return c.json({ id }, 201)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Delete a memory by id */
  app.delete('/memories/:id', (c) => {
    try {
      const id = Number(c.req.param('id'))
      if (Number.isNaN(id)) {
        return c.json({ error: 'invalid memory id' }, 400)
      }
      const deleted = deleteMemory(id)
      if (!deleted) {
        return c.json({ error: 'memory not found' }, 404)
      }
      return c.json({ ok: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  return app
}
