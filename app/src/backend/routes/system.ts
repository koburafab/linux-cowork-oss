/**
 * System routes — status, settings, audit, file-history/undo, open-file
 */

import { Hono } from 'hono'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
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
      // Never expose API keys in responses
      const safe = {
        ...settings,
        anthropicApiKey: settings.anthropicApiKey ? '••••' : '',
        apiKeys: Object.fromEntries(
          Object.entries(settings.apiKeys || {}).map(([k, v]) => [k, v ? '••••' : ''])
        ),
      }
      return c.json(safe)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 500)
    }
  })

  app.put('/settings', async (c) => {
    try {
      const body = await c.req.json<Settings>()
      // The GET endpoint masks existing keys as '••••' for security. When the
      // panel saves, it sends those masks back — so we must NOT overwrite a real
      // stored key with the mask. Keep the existing value for any masked field.
      const MASK = '••••'
      const current = loadSettings()
      if (body.apiKeys) {
        for (const k of Object.keys(body.apiKeys)) {
          if (body.apiKeys[k] === MASK) {
            body.apiKeys[k] = current.apiKeys?.[k] || ''
          }
        }
      }
      const bodyAny = body as Settings & { anthropicApiKey?: string }
      if (bodyAny.anthropicApiKey === MASK) {
        bodyAny.anthropicApiKey = current.anthropicApiKey || ''
      }
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

  // --- Open file in default browser ---

  app.post('/open-file', async (c) => {
    try {
      const body = await c.req.json<{ content: string; filename?: string }>()
      if (!body.content || typeof body.content !== 'string') {
        return c.json({ error: 'content is required' }, 400)
      }
      const filename = body.filename ?? `artifact-${Date.now()}.html`
      const filePath = join(tmpdir(), filename)
      writeFileSync(filePath, body.content, 'utf-8')
      execSync(`xdg-open "${filePath}"`)
      return c.json({ ok: true, path: filePath })
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
