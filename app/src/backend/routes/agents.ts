/**
 * Agent routes — CRUD + messaging for multi-agent orchestration
 */

import { Hono } from 'hono'
import { agentOrchestrator } from '../../core/agent/orchestrator'
import type { AgentConfig } from '../../core/agent/orchestrator'
import { DEFAULT_MODELS } from '../../core/models/types'
import type { ModelConfig } from '../../core/models/types'
import { loadSettings } from '../../core/settings'

export type AgentStatus = 'running' | 'done' | 'failed'

/** Resolve a model id to a full ModelConfig with the right API key (same logic as chat). */
function resolveAgentModel(modelId?: string): ModelConfig {
  const settings = loadSettings()
  const config: ModelConfig =
    DEFAULT_MODELS.find((m) => m.id === (modelId || settings.activeModel)) || DEFAULT_MODELS[0]
  const keys = settings.apiKeys || {}
  if (config.provider === 'anthropic') {
    config.apiKey = keys.anthropic || settings.anthropicApiKey || ''
  } else if (config.baseUrl?.includes('deepseek.com')) {
    config.apiKey = keys.deepseek || ''
  } else if (config.baseUrl?.includes('moonshot.ai') || config.baseUrl?.includes('moonshot.cn')) {
    config.apiKey = keys.moonshot || ''
  } else if (config.baseUrl?.includes('openrouter.ai')) {
    config.apiKey = keys.openrouter || ''
  } else if (config.baseUrl?.includes('openai.com')) {
    config.apiKey = keys.openai || ''
  }
  return config
}

interface AgentEntry {
  id: string
  name: string
  status: AgentStatus
  task: string
  createdAt: number
}

/** In-memory status tracking (orchestrator doesn't track status/task) */
const agentStatuses = new Map<string, { status: AgentStatus; task: string }>()

export function createAgentRoutes(): Hono {
  const app = new Hono()

  /**
   * POST /agents — spawn a new agent
   * Body: { name, model?, systemPrompt?, task }
   */
  app.post('/agents', async (c) => {
    const body = await c.req.json<{
      name: string
      model?: string
      systemPrompt?: string
      task: string
    }>()

    if (!body.name || typeof body.name !== 'string') {
      return c.json({ error: 'name is required' }, 400)
    }
    if (!body.task || typeof body.task !== 'string') {
      return c.json({ error: 'task is required' }, 400)
    }

    const config: AgentConfig = {
      name: body.name,
      model: resolveAgentModel(body.model),
      systemPrompt: body.systemPrompt || `You are ${body.name}, an AI agent.`,
    }

    const agent = agentOrchestrator.spawnAgent(config)

    // Track status and task
    agentStatuses.set(agent.id, { status: 'running', task: body.task })

    // Send the task as first user message (background, non-blocking)
    agentOrchestrator.sendToAgent(agent.id, body.task)

    return c.json({
      id: agent.id,
      name: agent.config.name,
      status: 'running' as AgentStatus,
    }, 201)
  })

  /**
   * GET /agents — list all active agents
   */
  app.get('/agents', (c) => {
    const agents = agentOrchestrator.listAgents()
    const result: AgentEntry[] = agents.map((a) => {
      const meta = agentStatuses.get(a.id)
      return {
        id: a.id,
        name: a.config.name,
        status: meta?.status ?? 'running',
        task: meta?.task ?? '',
        createdAt: a.createdAt,
      }
    })
    return c.json({ agents: result })
  })

  /**
   * GET /agents/:id — get a specific agent with history
   */
  app.get('/agents/:id', (c) => {
    const id = c.req.param('id')
    const agent = agentOrchestrator.getAgent(id)
    if (!agent) {
      return c.json({ error: `Agent '${id}' not found` }, 404)
    }
    const meta = agentStatuses.get(id)
    return c.json({
      id: agent.id,
      name: agent.config.name,
      status: meta?.status ?? 'running',
      task: meta?.task ?? '',
      createdAt: agent.createdAt,
      history: agent.history,
    })
  })

  /**
   * DELETE /agents/:id — kill an agent
   */
  app.delete('/agents/:id', (c) => {
    const id = c.req.param('id')
    const killed = agentOrchestrator.killAgent(id)
    if (!killed) {
      return c.json({ error: `Agent '${id}' not found` }, 404)
    }
    agentStatuses.delete(id)
    return c.json({ ok: true })
  })

  /**
   * POST /agents/:id/message — send a message to an agent
   */
  app.post('/agents/:id/message', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json<{ message: string }>()

    if (!body.message || typeof body.message !== 'string') {
      return c.json({ error: 'message is required' }, 400)
    }

    try {
      agentOrchestrator.sendToAgent(id, body.message)
      const history = agentOrchestrator.getAgentResponse(id)
      return c.json({ ok: true, history })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return c.json({ error: msg }, 404)
    }
  })

  return app
}

/** Exported for testing — clear status tracking */
export function clearAgentStatuses(): void {
  agentStatuses.clear()
}
