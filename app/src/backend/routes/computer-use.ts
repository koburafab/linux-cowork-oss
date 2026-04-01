/**
 * Computer-use routes — screenshot, click, windows
 */

import { Hono } from 'hono'
import { captureScreenshot } from '../../core/computer-use/screenshot'
import {
  mouseMove,
  mouseClick,
  listWindows,
} from '../../core/computer-use/input'

export function createComputerUseRoutes(): Hono {
  const app = new Hono()

  app.post('/computer-use/screenshot', async (c) => {
    try {
      const body = await c.req.json<{
        mode?: 'fullscreen' | 'window'
        maxWidth?: number
      }>().catch(() => ({ mode: undefined, maxWidth: undefined }))

      const result = await captureScreenshot({
        mode: body.mode || 'fullscreen',
        maxWidth: body.maxWidth || 1280,
      })

      return c.json({
        ok: true,
        path: result.path,
        width: result.width,
        height: result.height,
        base64: result.base64,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ ok: false, error: msg }, 500)
    }
  })

  app.post('/computer-use/click', async (c) => {
    try {
      const body = await c.req.json<{
        x: number
        y: number
        button?: 'left' | 'right' | 'middle'
      }>()

      if (typeof body.x !== 'number' || typeof body.y !== 'number') {
        return c.json({ error: 'x and y are required numbers' }, 400)
      }

      await mouseMove(body.x, body.y)
      await mouseClick(body.button || 'left')

      return c.json({ ok: true, x: body.x, y: body.y, button: body.button || 'left' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ ok: false, error: msg }, 500)
    }
  })

  app.get('/computer-use/windows', (c) => {
    try {
      const windows = listWindows()
      return c.json({ ok: true, windows })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ ok: false, error: msg }, 500)
    }
  })

  return app
}
