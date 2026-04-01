import { describe, it, expect, beforeEach } from 'vitest'
import { AgentOrchestrator } from '../src/core/agent/orchestrator'
import type { ModelConfig } from '../src/core/models/types'

const testModel: ModelConfig = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'ollama',
  model: 'test',
  baseUrl: 'http://localhost:11434',
}

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator

  beforeEach(() => {
    orchestrator = new AgentOrchestrator()
  })

  describe('spawnAgent', () => {
    it('should create an agent with system prompt in history', () => {
      const agent = orchestrator.spawnAgent({
        name: 'test-agent',
        model: testModel,
        systemPrompt: 'You are a test agent.',
      })

      expect(agent.id).toBeTruthy()
      expect(agent.config.name).toBe('test-agent')
      expect(agent.history).toHaveLength(1)
      expect(agent.history[0].role).toBe('system')
      expect(agent.history[0].content).toBe('You are a test agent.')
    })

    it('should assign unique ids', () => {
      const a1 = orchestrator.spawnAgent({
        name: 'a1',
        model: testModel,
        systemPrompt: 'p1',
      })
      const a2 = orchestrator.spawnAgent({
        name: 'a2',
        model: testModel,
        systemPrompt: 'p2',
      })

      expect(a1.id).not.toBe(a2.id)
    })
  })

  describe('sendToAgent', () => {
    it('should append a user message to agent history', () => {
      const agent = orchestrator.spawnAgent({
        name: 'chatter',
        model: testModel,
        systemPrompt: 'sys',
      })

      orchestrator.sendToAgent(agent.id, 'Hello agent!')

      const history = orchestrator.getAgentResponse(agent.id)
      expect(history).toHaveLength(2)
      expect(history[1].role).toBe('user')
      expect(history[1].content).toBe('Hello agent!')
    })

    it('should throw for unknown agent', () => {
      expect(() =>
        orchestrator.sendToAgent('bogus-id', 'hi'),
      ).toThrow("Agent 'bogus-id' not found")
    })
  })

  describe('getAgentResponse', () => {
    it('should return a copy of history', () => {
      const agent = orchestrator.spawnAgent({
        name: 'resp',
        model: testModel,
        systemPrompt: 'sys',
      })

      const history = orchestrator.getAgentResponse(agent.id)
      history.push({ role: 'user', content: 'injected', timestamp: 0 })

      // Original should be unaffected
      expect(orchestrator.getAgentResponse(agent.id)).toHaveLength(1)
    })

    it('should throw for unknown agent', () => {
      expect(() =>
        orchestrator.getAgentResponse('nope'),
      ).toThrow("Agent 'nope' not found")
    })
  })

  describe('killAgent', () => {
    it('should remove an agent', () => {
      const agent = orchestrator.spawnAgent({
        name: 'doomed',
        model: testModel,
        systemPrompt: 'bye',
      })

      expect(orchestrator.killAgent(agent.id)).toBe(true)
      expect(orchestrator.listAgents()).toHaveLength(0)
    })

    it('should return false for unknown agent', () => {
      expect(orchestrator.killAgent('no-such-id')).toBe(false)
    })
  })

  describe('listAgents', () => {
    it('should list all active agents', () => {
      orchestrator.spawnAgent({ name: 'a', model: testModel, systemPrompt: 'p' })
      orchestrator.spawnAgent({ name: 'b', model: testModel, systemPrompt: 'p' })
      orchestrator.spawnAgent({ name: 'c', model: testModel, systemPrompt: 'p' })

      expect(orchestrator.listAgents()).toHaveLength(3)
    })

    it('should return empty when no agents', () => {
      expect(orchestrator.listAgents()).toEqual([])
    })
  })

  describe('clear', () => {
    it('should remove all agents', () => {
      orchestrator.spawnAgent({ name: 'x', model: testModel, systemPrompt: 'p' })
      orchestrator.spawnAgent({ name: 'y', model: testModel, systemPrompt: 'p' })

      orchestrator.clear()
      expect(orchestrator.listAgents()).toEqual([])
    })
  })
})
