/**
 * Hono backend server — connects all modules
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { coworkApp } from '../core/integration'
import { createChatRoutes } from './routes/chat'
import { createComputerUseRoutes } from './routes/computer-use'
import { createSystemRoutes } from './routes/system'
import { createDefaultRegistry } from './tool-registry'

export function createServer(): Hono {
  const app = new Hono()

  // CORS for WebView
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  // Tool registry
  const toolRegistry = createDefaultRegistry()

  // Mount routes
  app.route('/api', createChatRoutes(toolRegistry))
  app.route('/api', createComputerUseRoutes())
  app.route('/api', createSystemRoutes())

  // Health check
  app.get('/health', (c) => c.json({ ok: true }))

  return app
}

/**
 * Start the server — init CoworkApp then listen
 */
export async function startServer(port = 3001): Promise<void> {
  await coworkApp.init()

  const app = createServer()

  console.log(`Server listening on http://localhost:${port}`)

  Bun.serve({
    port,
    fetch: app.fetch,
  })
}

// Run if executed directly
if (import.meta.main) {
  startServer()
}
