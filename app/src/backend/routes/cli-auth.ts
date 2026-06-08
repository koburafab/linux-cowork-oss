/**
 * CLI auth routes — detect whether the Claude / Codex CLIs are installed and
 * logged in (for the subscription providers), and trigger their login flow.
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'

const HOME = homedir()
const PATH_ENV = `${HOME}/.local/bin:${HOME}/.bun/bin:${process.env.PATH || ''}`

/** Find a CLI binary in the usual install locations. */
function findBin(cmd: string): string | null {
  const candidates = [
    join(HOME, '.local/bin', cmd),
    join(HOME, '.bun/bin', cmd),
    `/usr/local/bin/${cmd}`,
    `/usr/bin/${cmd}`,
  ]
  return candidates.find((p) => existsSync(p)) || null
}

async function run(bin: string, args: string[], timeoutMs = 8000): Promise<{ code: number; out: string }> {
  try {
    const proc = Bun.spawn([bin, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, PATH: PATH_ENV },
    })
    const timer = setTimeout(() => proc.kill(), timeoutMs)
    const out = await new Response(proc.stdout).text()
    const err = await new Response(proc.stderr).text()
    const code = await proc.exited
    clearTimeout(timer)
    return { code, out: `${out}${err}` }
  } catch {
    return { code: -1, out: '' }
  }
}

export function createCliAuthRoutes(): Hono {
  const app = new Hono()

  /** GET /cli-status — is each subscription CLI installed + logged in? */
  app.get('/cli-status', async (c) => {
    const claudeBin = findBin('claude')
    const codexBin = findBin('codex')

    // Claude: OAuth credentials file present = logged in via subscription
    const claudeLoggedIn =
      !!claudeBin &&
      (existsSync(join(HOME, '.claude/.credentials.json')) ||
        existsSync(join(HOME, '.claude.json')))

    // Codex: ask the CLI directly
    let codexLoggedIn = false
    if (codexBin) {
      const r = await run(codexBin, ['login', 'status'])
      codexLoggedIn = /logged in/i.test(r.out)
    }

    return c.json({
      claude: { installed: !!claudeBin, loggedIn: claudeLoggedIn },
      codex: { installed: !!codexBin, loggedIn: codexLoggedIn },
    })
  })

  /** POST /cli-login/:tool — launch the login flow (opens browser). Non-blocking. */
  app.post('/cli-login/:tool', async (c) => {
    const tool = c.req.param('tool')
    const bin = tool === 'codex' ? findBin('codex') : tool === 'claude' ? findBin('claude') : null
    if (!bin) return c.json({ error: `${tool} n'est pas installé` }, 404)

    // codex login opens the browser; claude uses setup-token (interactive)
    const args = tool === 'codex' ? ['login'] : ['setup-token']
    try {
      Bun.spawn([bin, ...args], { env: { ...process.env, PATH: PATH_ENV }, stdout: 'ignore', stderr: 'ignore' })
      return c.json({ started: true, hint: 'Termine la connexion dans le navigateur / terminal qui vient de s’ouvrir.' })
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
    }
  })

  return app
}
