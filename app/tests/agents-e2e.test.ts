/**
 * Tests for AgentOrchestrator — no vi.mock to avoid test pollution
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AgentOrchestrator } from '../src/core/agent/orchestrator'

describe('AgentOrchestrator E2E', () => {
  let orch: AgentOrchestrator

  beforeEach(() => {
    orch = new AgentOrchestrator()
  })

  it('should spawn an agent', () => {
    const agent = orch.spawnAgent({
      name: 'test-agent',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'You are a test agent',
    })
    expect(agent).toBeDefined()
    expect(agent.config.name).toBe('test-agent')
  })

  it('should list agents', () => {
    orch.spawnAgent({
      name: 'agent-1',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    orch.spawnAgent({
      name: 'agent-2',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    expect(orch.listAgents()).toHaveLength(2)
  })

  it('should send message to agent', () => {
    const agent = orch.spawnAgent({
      name: 'msg-agent',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    orch.sendToAgent(agent.id, 'hello')
    const history = orch.getAgentResponse(agent.id)
    expect(history.length).toBeGreaterThan(0)
    expect(history[history.length - 1].content).toBe('hello')
  })

  it('should kill an agent', () => {
    const agent = orch.spawnAgent({
      name: 'kill-me',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    expect(orch.killAgent(agent.id)).toBe(true)
    expect(orch.listAgents()).toHaveLength(0)
  })

  it('should return false when killing unknown agent', () => {
    expect(orch.killAgent('nonexistent')).toBe(false)
  })

  it('should get specific agent', () => {
    const agent = orch.spawnAgent({
      name: 'find-me',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    const found = orch.getAgent(agent.id)
    expect(found).toBeDefined()
    expect(found!.config.name).toBe('find-me')
  })

  it('should return undefined for unknown agent', () => {
    expect(orch.getAgent('nope')).toBeUndefined()
  })

  it('should clear all agents', () => {
    orch.spawnAgent({
      name: 'a1',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    orch.spawnAgent({
      name: 'a2',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    orch.clear()
    expect(orch.listAgents()).toHaveLength(0)
  })

  it('should isolate agent conversations', () => {
    const a1 = orch.spawnAgent({
      name: 'iso-1',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    const a2 = orch.spawnAgent({
      name: 'iso-2',
      model: { id: 'test', name: 'Test', provider: 'ollama', model: 'test' },
      systemPrompt: 'test',
    })
    orch.sendToAgent(a1.id, 'msg for a1')
    orch.sendToAgent(a2.id, 'msg for a2')

    const h1 = orch.getAgentResponse(a1.id)
    const h2 = orch.getAgentResponse(a2.id)
    expect(h1[h1.length - 1].content).toBe('msg for a1')
    expect(h2[h2.length - 1].content).toBe('msg for a2')
  })
})
