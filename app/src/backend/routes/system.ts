/**
 * System routes — status, settings, audit
 */

import { Hono } from 'hono'
import { coworkApp } from '../../core/integration'
import { loadSettings, saveSettings, type Settings } from '../../core/settings'
import { getRecentAudit } from '../../core/audit'

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

  return app
}
