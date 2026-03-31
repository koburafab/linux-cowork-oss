import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../src/stores/chatStore'

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: [],
      isStreaming: false,
      auditLog: [],
    })
  })

  it('should start with empty messages', () => {
    const state = useChatStore.getState()
    expect(state.messages).toEqual([])
  })

  it('should add a message', () => {
    const store = useChatStore.getState()
    store.addMessage({
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    })
    expect(useChatStore.getState().messages).toHaveLength(1)
    expect(useChatStore.getState().messages[0].content).toBe('Hello')
  })

  it('should add multiple messages', () => {
    const store = useChatStore.getState()
    store.addMessage({ role: 'user', content: 'Hello', timestamp: 1 })
    store.addMessage({
      role: 'assistant',
      content: 'Hi there!',
      timestamp: 2,
    })
    expect(useChatStore.getState().messages).toHaveLength(2)
  })

  it('should clear messages', () => {
    const store = useChatStore.getState()
    store.addMessage({ role: 'user', content: 'Hello', timestamp: 1 })
    store.clearMessages()
    expect(useChatStore.getState().messages).toEqual([])
  })

  it('should set active model', () => {
    const store = useChatStore.getState()
    const newModel = {
      id: 'test',
      name: 'Test Model',
      provider: 'ollama' as const,
      model: 'llama3',
    }
    store.setActiveModel(newModel)
    expect(useChatStore.getState().activeModel.id).toBe('test')
  })

  it('should toggle streaming state', () => {
    const store = useChatStore.getState()
    expect(useChatStore.getState().isStreaming).toBe(false)
    store.setStreaming(true)
    expect(useChatStore.getState().isStreaming).toBe(true)
    store.setStreaming(false)
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('should add audit entries', () => {
    const store = useChatStore.getState()
    store.addAuditEntry('chat', 'User sent message')
    store.addAuditEntry('tool', 'Executed file read')
    expect(useChatStore.getState().auditLog).toHaveLength(2)
    expect(useChatStore.getState().auditLog[0].action).toBe('chat')
    expect(useChatStore.getState().auditLog[1].action).toBe('tool')
  })

  it('should have default models', () => {
    const state = useChatStore.getState()
    expect(state.availableModels.length).toBeGreaterThan(0)
    expect(state.activeModel).toBeDefined()
  })
})
