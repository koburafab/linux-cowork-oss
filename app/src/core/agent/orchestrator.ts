/**
 * Agent Orchestrator — manages in-process agents with conversation history
 */

import type { ModelConfig, ChatMessage } from '../models/types'

export interface AgentConfig {
  name: string
  model: ModelConfig
  systemPrompt: string
  tools?: string[]
}

export interface Agent {
  id: string
  config: AgentConfig
  history: ChatMessage[]
  createdAt: number
}

let nextId = 1

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map()

  /**
   * Spawn a new agent with its own conversation context
   */
  spawnAgent(config: AgentConfig): Agent {
    const id = `agent-${nextId++}`
    const agent: Agent = {
      id,
      config,
      history: [
        {
          role: 'system',
          content: config.systemPrompt,
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
    }
    this.agents.set(id, agent)
    return agent
  }

  /**
   * Send a user message to an agent, appending to its history
   */
  sendToAgent(agentId: string, message: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`)
    }

    agent.history.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })
  }

  /**
   * Get the agent's full conversation history
   */
  getAgentResponse(agentId: string): ChatMessage[] {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`)
    }
    return [...agent.history]
  }

  /**
   * Kill (remove) an agent
   */
  killAgent(agentId: string): boolean {
    return this.agents.delete(agentId)
  }

  /**
   * List all active agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get a specific agent by id
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear()
  }
}

/** Singleton orchestrator instance */
export const agentOrchestrator = new AgentOrchestrator()
