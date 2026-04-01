/**
 * Advanced Zustand store tests
 * Performance, model tracking, audit log ordering, reset
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../src/stores/chatStore'
import { DEFAULT_MODELS } from '../src/core/models/types'
import type { ChatMessage, ModelConfig } from '../src/core/models/types'

describe('Chat Store - Advanced', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      activeModel: DEFAULT_MODELS[0],
      availableModels: DEFAULT_MODELS,
      isStreaming: false,
      auditLog: [],
    })
  })

  describe('messages with model info', () => {
    it('should store messages with model field', () => {
      const store = useChatStore.getState()
      const msg: ChatMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
        model: 'claude-sonnet-4-5-20250514',
      }
      store.addMessage(msg)

      const messages = useChatStore.getState().messages
      expect(messages[0].model).toBe('claude-sonnet-4-5-20250514')
    })

    it('should allow messages without model field', () => {
      const store = useChatStore.getState()
      store.addMessage({ role: 'user', content: 'Hi', timestamp: 1 })

      const messages = useChatStore.getState().messages
      expect(messages[0].model).toBeUndefined()
    })

    it('should track model per message when model changes mid-conversation', () => {
      const store = useChatStore.getState()

      // Message with first model
      store.addMessage({
        role: 'user',
        content: 'msg1',
        timestamp: 1,
        model: 'claude-sonnet-4-5-20250514',
      })

      // Switch model
      const ollamaModel: ModelConfig = {
        id: 'ollama-local',
        name: 'Ollama',
        provider: 'ollama',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434',
      }
      store.setActiveModel(ollamaModel)

      // Message with second model
      useChatStore.getState().addMessage({
        role: 'user',
        content: 'msg2',
        timestamp: 2,
        model: 'llama3.2',
      })

      const messages = useChatStore.getState().messages
      expect(messages[0].model).toBe('claude-sonnet-4-5-20250514')
      expect(messages[1].model).toBe('llama3.2')
      expect(useChatStore.getState().activeModel.id).toBe('ollama-local')
    })
  })

  describe('audit log', () => {
    it('should have strictly increasing timestamps', async () => {
      const store = useChatStore.getState()

      store.addAuditEntry('action1', 'details1')
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 2))
      useChatStore.getState().addAuditEntry('action2', 'details2')
      await new Promise((r) => setTimeout(r, 2))
      useChatStore.getState().addAuditEntry('action3', 'details3')

      const log = useChatStore.getState().auditLog
      expect(log).toHaveLength(3)

      for (let i = 1; i < log.length; i++) {
        expect(log[i].timestamp).toBeGreaterThan(log[i - 1].timestamp)
      }
    })

    it('should include model name from active model', () => {
      const store = useChatStore.getState()
      store.addAuditEntry('chat', 'test message')

      const entry = useChatStore.getState().auditLog[0]
      expect(entry.model).toBe(DEFAULT_MODELS[0].name)
    })

    it('should reflect model change in audit entries', () => {
      const store = useChatStore.getState()

      store.addAuditEntry('chat', 'before switch')

      store.setActiveModel({
        id: 'custom',
        name: 'Custom Model',
        provider: 'openai-compatible',
        model: 'gpt-custom',
      })

      useChatStore.getState().addAuditEntry('chat', 'after switch')

      const log = useChatStore.getState().auditLog
      expect(log[0].model).toBe(DEFAULT_MODELS[0].name)
      expect(log[1].model).toBe('Custom Model')
    })
  })

  describe('performance', () => {
    it('should handle 1000 messages in under 100ms', () => {
      const store = useChatStore.getState()
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        useChatStore.getState().addMessage({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message number ${i}`,
          timestamp: i,
          model: 'test-model',
        })
      }

      const elapsed = performance.now() - start

      expect(useChatStore.getState().messages).toHaveLength(1000)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('full reset', () => {
    it('should reset all state to defaults', () => {
      const store = useChatStore.getState()

      // Populate state
      store.addMessage({ role: 'user', content: 'Hi', timestamp: 1 })
      store.addMessage({ role: 'assistant', content: 'Hello', timestamp: 2 })
      store.setStreaming(true)
      store.addAuditEntry('chat', 'test')
      store.setActiveModel({
        id: 'custom',
        name: 'Custom',
        provider: 'ollama',
        model: 'custom',
      })

      // Verify populated
      expect(useChatStore.getState().messages).toHaveLength(2)
      expect(useChatStore.getState().isStreaming).toBe(true)
      expect(useChatStore.getState().auditLog).toHaveLength(1)
      expect(useChatStore.getState().activeModel.id).toBe('custom')

      // Full reset
      useChatStore.setState({
        messages: [],
        activeModel: DEFAULT_MODELS[0],
        availableModels: DEFAULT_MODELS,
        isStreaming: false,
        auditLog: [],
      })

      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.isStreaming).toBe(false)
      expect(state.auditLog).toEqual([])
      expect(state.activeModel.id).toBe(DEFAULT_MODELS[0].id)
      expect(state.availableModels).toEqual(DEFAULT_MODELS)
    })

    it('clearMessages should not affect audit log or model', () => {
      const store = useChatStore.getState()

      store.addMessage({ role: 'user', content: 'Hi', timestamp: 1 })
      store.addAuditEntry('chat', 'logged')
      store.setActiveModel({
        id: 'special',
        name: 'Special',
        provider: 'ollama',
        model: 'special',
      })

      useChatStore.getState().clearMessages()

      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.auditLog).toHaveLength(1)
      expect(state.activeModel.id).toBe('special')
    })
  })
})
