import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initDB,
  closeDB,
  saveMemory,
  getMemories,
  saveConversation,
  getConversations,
  saveMessage,
  getMessages,
  logAudit,
  getAuditLog,
} from '../src/core/memory/db'

describe('Memory DB', () => {
  beforeEach(() => {
    initDB(':memory:')
  })

  afterEach(() => {
    closeDB()
  })

  describe('initDB', () => {
    it('should initialize without error', () => {
      // Already initialized in beforeEach
      expect(true).toBe(true)
    })

    it('should throw if DB not initialized and we try to use it', () => {
      closeDB()
      expect(() => saveMemory({ type: 'user', name: 'test', content: 'x' })).toThrow(
        'Database not initialized',
      )
    })
  })

  describe('memories', () => {
    it('should save and retrieve a memory', () => {
      const id = saveMemory({ type: 'user', name: 'pref', content: 'dark mode' })
      expect(id).toBeGreaterThan(0)

      const mems = getMemories()
      expect(mems).toHaveLength(1)
      expect(mems[0].name).toBe('pref')
      expect(mems[0].content).toBe('dark mode')
      expect(mems[0].type).toBe('user')
    })

    it('should filter memories by type', () => {
      saveMemory({ type: 'user', name: 'a', content: '1' })
      saveMemory({ type: 'project', name: 'b', content: '2' })
      saveMemory({ type: 'feedback', name: 'c', content: '3' })

      expect(getMemories('user')).toHaveLength(1)
      expect(getMemories('project')).toHaveLength(1)
      expect(getMemories('feedback')).toHaveLength(1)
      expect(getMemories()).toHaveLength(3)
    })
  })

  describe('conversations', () => {
    it('should save and retrieve conversations', () => {
      const id = saveConversation({ title: 'Test Chat', model: 'claude-sonnet' })
      expect(id).toBeGreaterThan(0)

      const convs = getConversations()
      expect(convs).toHaveLength(1)
      expect(convs[0].title).toBe('Test Chat')
      expect(convs[0].model).toBe('claude-sonnet')
    })

    it('should return multiple conversations', () => {
      saveConversation({ title: 'Chat 1', model: 'claude' })
      saveConversation({ title: 'Chat 2', model: 'ollama' })

      expect(getConversations()).toHaveLength(2)
    })
  })

  describe('messages', () => {
    it('should save and retrieve messages for a conversation', () => {
      const convId = saveConversation({ title: 'Test', model: 'claude' })

      saveMessage({
        conversation_id: convId,
        role: 'user',
        content: 'Hello',
        timestamp: 1000,
      })
      saveMessage({
        conversation_id: convId,
        role: 'assistant',
        content: 'Hi!',
        timestamp: 2000,
        model: 'claude-sonnet',
      })

      const msgs = getMessages(convId)
      expect(msgs).toHaveLength(2)
      expect(msgs[0].role).toBe('user')
      expect(msgs[0].content).toBe('Hello')
      expect(msgs[1].role).toBe('assistant')
      expect(msgs[1].model).toBe('claude-sonnet')
    })

    it('should return messages ordered by timestamp', () => {
      const convId = saveConversation({ title: 'Test', model: 'claude' })

      saveMessage({ conversation_id: convId, role: 'user', content: 'second', timestamp: 200 })
      saveMessage({ conversation_id: convId, role: 'user', content: 'first', timestamp: 100 })

      const msgs = getMessages(convId)
      expect(msgs[0].content).toBe('first')
      expect(msgs[1].content).toBe('second')
    })

    it('should isolate messages per conversation', () => {
      const conv1 = saveConversation({ title: 'A', model: 'x' })
      const conv2 = saveConversation({ title: 'B', model: 'y' })

      saveMessage({ conversation_id: conv1, role: 'user', content: 'a', timestamp: 1 })
      saveMessage({ conversation_id: conv2, role: 'user', content: 'b', timestamp: 2 })

      expect(getMessages(conv1)).toHaveLength(1)
      expect(getMessages(conv2)).toHaveLength(1)
      expect(getMessages(conv1)[0].content).toBe('a')
    })
  })

  describe('audit log', () => {
    it('should save and retrieve audit entries', () => {
      const id = logAudit({
        action: 'chat:user',
        details: 'User sent message',
        model: 'claude',
        timestamp: Date.now(),
      })
      expect(id).toBeGreaterThan(0)

      const entries = getAuditLog()
      expect(entries).toHaveLength(1)
      expect(entries[0].action).toBe('chat:user')
    })

    it('should limit audit log results', () => {
      for (let i = 0; i < 10; i++) {
        logAudit({ action: `action-${i}`, details: 'x', timestamp: i })
      }

      expect(getAuditLog(5)).toHaveLength(5)
      expect(getAuditLog()).toHaveLength(10)
    })

    it('should return entries in reverse chronological order', () => {
      logAudit({ action: 'first', details: 'x', timestamp: 100 })
      logAudit({ action: 'second', details: 'x', timestamp: 200 })

      const entries = getAuditLog()
      expect(entries[0].action).toBe('second')
      expect(entries[1].action).toBe('first')
    })
  })
})
