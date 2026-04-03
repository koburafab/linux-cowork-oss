/**
 * System routes — status, settings, audit, file-history/undo
 */

import { Hono } from 'hono'
import { coworkApp } from '../../core/integration'
import { loadSettings, saveSettings, type Settings } from '../../core/settings'
import { getRecentAudit } from '../../core/audit'
import { FileHistoryManager } from '../../core/file-history'
import { tokenTracker } from '../token-tracker'

export const fileHistoryManager = new FileHistoryManager()

export function createSystemRoutes(): Hono {
  const app = new Hono()

  app.get('/status', (c) => {
    try {
      const status = coworkApp.getStatus()
      return c.json(status)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  app.get('/settings', (c) => {
    try {
      const settings = loadSettings()
      return c.json(settings)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  app.put('/settings', async (c) => {
    try {
      const body = await c.req.json<Settings>()
      saveSettings(body)
      return c.json({ ok: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  app.get('/audit', (c) => {
    try {
      const limit = Number(c.req.query('limit')) || 50
      const entries = getRecentAudit(limit)
      return c.json({ entries })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  // --- Token usage ---

  app.get('/tokens', (c) => {
    return c.json(tokenTracker.toJSON())
  })

  // --- File history / undo ---

  app.post('/undo', async (c) => {
    try {
      const body = await c.req.json<{ path: string }>()
      if (!body.path || typeof body.path !== 'string') {
        return c.json({ error: 'path is required' }, 400)
      }
      const snap = await fileHistoryManager.undo(body.path)
      if (!snap) {
        return c.json({ error: 'No history for this file' }, 404)
      }
      return c.json({ ok: true, snapshot: snap })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  app.get('/file-history/:path', (c) => {
    try {
      const filePath = decodeURIComponent(c.req.param('path'))
      if (!filePath) {
        return c.json({ error: 'path is required' }, 400)
      }
      const history = fileHistoryManager.getHistory(filePath)
      return c.json({ path: filePath, snapshots: history })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  return app
}
