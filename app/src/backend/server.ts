/**
 * Hono backend server — connects all modules
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { coworkApp } from '../core/integration'
import { createChatRoutes } from './routes/chat'
import { createComputerUseRoutes } from './routes/computer-use'
import { createAutonomousRoutes } from './routes/autonomous'
import { createSystemRoutes } from './routes/system'
import { createConversationRoutes } from './routes/conversations'
import { createMemoryRoutes } from './routes/memories'
import { createAgentRoutes } from './routes/agents'
import { createWorkflowRoutes } from './routes/workflows'
import { createPluginRoutes } from './routes/plugins'
import { createMcpRoutes } from './routes/mcp'
import { createDefaultRegistry } from './tool-registry'
import { DEFAULT_MODELS } from '../core/models/types'

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
  app.route('/api', createAutonomousRoutes(toolRegistry))
  app.route('/api', createSystemRoutes())
  app.route('/api', createConversationRoutes())
  app.route('/api', createMemoryRoutes())
  app.route('/api', createAgentRoutes())
  app.route('/api', createWorkflowRoutes())
  app.route('/api', createPluginRoutes())
  app.route('/api', createMcpRoutes())

  // Health check
  app.get('/health', (c) => c.json({ ok: true }))

  // Mobile chat UI — serves a minimal HTML page at GET /
  app.get('/', (c) => {
    const modelOptions = DEFAULT_MODELS.map(
      (m) => `<option value="${m.id}">${m.name}</option>`,
    ).join('\n        ')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Linux Cowork</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a2e; color: #eee; height: 100dvh; display: flex; flex-direction: column; }
    #header { padding: 8px 12px; background: #16213e; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    #header h1 { font-size: 1rem; flex: 1; }
    #model-select { background: #0f3460; color: #eee; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; font-size: 0.85rem; }
    #messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; font-size: 0.95rem; }
    .msg.user { align-self: flex-end; background: #0f3460; }
    .msg.assistant { align-self: flex-start; background: #2a2a4a; }
    #input-bar { display: flex; gap: 8px; padding: 8px 12px; background: #16213e; flex-shrink: 0; }
    #input { flex: 1; padding: 10px; border: 1px solid #444; border-radius: 8px; background: #0f3460; color: #eee; font-size: 1rem; outline: none; }
    #send { padding: 10px 18px; background: #e94560; color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
    #send:disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <div id="header">
    <h1>Linux Cowork</h1>
    <select id="model-select">
        ${modelOptions}
    </select>
  </div>
  <div id="messages"></div>
  <div id="input-bar">
    <input id="input" type="text" placeholder="Type a message..." autocomplete="off" />
    <button id="send">Send</button>
  </div>
  <script>
    const msgs = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const modelSelect = document.getElementById('model-select');

    function addMsg(role, text) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg('user', text);
      sendBtn.disabled = true;

      const assistantDiv = addMsg('assistant', '');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, model: modelSelect.value }),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'text' && ev.content) {
                assistantDiv.textContent += ev.content;
                msgs.scrollTop = msgs.scrollHeight;
              } else if (ev.type === 'error') {
                assistantDiv.textContent += '[Error: ' + ev.content + ']';
              }
            } catch {}
          }
        }
      } catch (err) {
        assistantDiv.textContent = '[Network error: ' + err.message + ']';
      }
      sendBtn.disabled = false;
      input.focus();
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    input.focus();
  </script>
</body>
</html>`
    return c.html(html)
  })

  return app
}

/**
 * Start the server — init CoworkApp then listen
 */
export async function startServer(port = 3001): Promise<void> {
  await coworkApp.init()

  const app = createServer()

  console.log(`Server listening on http://0.0.0.0:${port}`)

  Bun.serve({
    hostname: '0.0.0.0',
    port,
    fetch: app.fetch,
    idleTimeout: 120, // 2 minutes for SSE streams
  })
}

// Run if executed directly
if (import.meta.main) {
  startServer()
}
