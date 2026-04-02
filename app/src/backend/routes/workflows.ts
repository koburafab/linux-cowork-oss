/**
 * Workflow routes — GET /api/workflows, POST /api/workflows/:id/run
 */

import { Hono } from 'hono'

export interface Workflow {
  id: string
  name: string
  description: string
  icon: string
  mode: 'chat' | 'file-ops' | 'computer-use'
  prompt: string
}

export const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'organize-downloads',
    name: 'Organize Downloads',
    description: 'Sort files in ~/Downloads by type',
    icon: '\u{1F4C1}',
    mode: 'file-ops',
    prompt:
      'List files in ~/Downloads and suggest how to organize them by type (documents, images, videos, archives). Create the folders and move the files.',
  },
  {
    id: 'system-health',
    name: 'System Health Check',
    description: 'Check disk, memory, CPU and services',
    icon: '\u{1F3E5}',
    mode: 'file-ops',
    prompt:
      'Check system health: disk usage (df -h), memory (free -h), CPU load (uptime), running services (systemctl list-units --state=running | head -20). Summarize any issues.',
  },
  {
    id: 'screenshot-describe',
    name: 'Describe My Screen',
    description: 'Take a screenshot and describe it',
    icon: '\u{1F4F8}',
    mode: 'computer-use',
    prompt: 'Take a screenshot of my desktop and describe everything you see in detail.',
  },
  {
    id: 'find-large-files',
    name: 'Find Large Files',
    description: 'Find the 20 largest files in home',
    icon: '\u{1F50D}',
    mode: 'file-ops',
    prompt:
      'Find the 20 largest files in my home directory (du -sh ~/* | sort -rh | head -20). Tell me what they are and if any can be safely deleted.',
  },
  {
    id: 'git-status',
    name: 'Git Status Report',
    description: 'Check all git repos in ~/Documents',
    icon: '\u{1F4CA}',
    mode: 'file-ops',
    prompt:
      'Check all git repositories in ~/Documents/ (find . -name .git -type d). For each, show the branch, status, and last commit.',
  },
  {
    id: 'daily-summary',
    name: 'Daily Summary',
    description: 'Uptime, disk, recent files, tasks',
    icon: '\u{1F4DD}',
    mode: 'file-ops',
    prompt:
      'Give me a summary of today: system uptime, disk usage, recent files modified in the last 24h (find ~ -mtime 0 -type f | head -20), and any running background tasks.',
  },
]

export function createWorkflowRoutes(): Hono {
  const app = new Hono()

  app.get('/workflows', (c) => {
    return c.json({ workflows: DEFAULT_WORKFLOWS })
  })

  app.post('/workflows/:id/run', async (c) => {
    const id = c.req.param('id')
    const workflow = DEFAULT_WORKFLOWS.find((w) => w.id === id)
    if (!workflow) {
      return c.json({ error: `Workflow '${id}' not found` }, 400)
    }
    return c.json({
      ok: true,
      workflow: { id: workflow.id, name: workflow.name, mode: workflow.mode },
      prompt: workflow.prompt,
    })
  })

  return app
}
