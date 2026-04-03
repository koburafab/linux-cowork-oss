/**
 * Conversation routes — CRUD for conversations and messages
 */

import { Hono } from 'hono'
import {
  saveConversation,
  getConversations,
  deleteConversation,
  renameConversation,
  saveMessage,
  getMessages,
} from '../../core/memory/db'

export function createConversationRoutes(): Hono {
  const app = new Hono()

  /** List all conversations */
  app.get('/conversations', (c) => {
    try {
      const conversations = getConversations()
      return c.json({ conversations })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Create a new conversation */
  app.post('/conversations', async (c) => {
    try {
      const body = await c.req.json<{ title: string; model: string }>()
      if (!body.title || !body.model) {
        return c.json({ error: 'title and model are required' }, 400)
      }
      const id = saveConversation({ title: body.title, model: body.model })
      return c.json({ id, title: body.title, model: body.model }, 201)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Get messages for a conversation */
  app.get('/conversations/:id/messages', (c) => {
    try {
      const id = Number(c.req.param('id'))
      if (Number.isNaN(id)) {
        return c.json({ error: 'invalid conversation id' }, 400)
      }
      const messages = getMessages(id)
      return c.json({ messages })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Save a message to a conversation */
  app.post('/conversations/:id/messages', async (c) => {
    try {
      const conversationId = Number(c.req.param('id'))
      if (Number.isNaN(conversationId)) {
        return c.json({ error: 'invalid conversation id' }, 400)
      }
      const body = await c.req.json<{
        role: 'user' | 'assistant' | 'system'
        content: string
        model?: string
      }>()
      if (!body.role || !body.content) {
        return c.json({ error: 'role and content are required' }, 400)
      }
      const id = saveMessage({
        conversation_id: conversationId,
        role: body.role,
        content: body.content,
        timestamp: Date.now(),
        model: body.model,
      })
      return c.json({ id }, 201)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Delete a conversation and its messages */
  app.delete('/conversations/:id', (c) => {
    try {
      const id = Number(c.req.param('id'))
      if (Number.isNaN(id)) {
        return c.json({ error: 'invalid conversation id' }, 400)
      }
      const deleted = deleteConversation(id)
      if (!deleted) {
        return c.json({ error: 'conversation not found' }, 404)
      }
      return c.json({ ok: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  /** Rename a conversation */
  app.put('/conversations/:id', async (c) => {
    try {
      const id = Number(c.req.param('id'))
      if (Number.isNaN(id)) {
        return c.json({ error: 'invalid conversation id' }, 400)
      }
      const body = await c.req.json<{ title: string }>()
      if (!body.title) {
        return c.json({ error: 'title is required' }, 400)
      }
      const updated = renameConversation(id, body.title)
      if (!updated) {
        return c.json({ error: 'conversation not found' }, 404)
      }
      return c.json({ ok: true, title: body.title })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  return app
}
