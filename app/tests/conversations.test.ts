/**
 * Tests for conversation and message CRUD via DB functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initDB,
  closeDB,
  saveConversation,
  getConversations,
  saveMessage,
  getMessages,
} from '../src/core/memory/db'

describe('Conversations', () => {
  beforeEach(() => {
    initDB(':memory:')
  })

  afterEach(() => {
    closeDB()
  })

  it('should create and list conversations', () => {
    const id1 = saveConversation({ title: 'First chat', model: 'deepseek-chat' })
    const id2 = saveConversation({ title: 'Second chat', model: 'gpt-4' })

    expect(id1).toBe(1)
    expect(id2).toBe(2)

    const convs = getConversations()
    expect(convs).toHaveLength(2)
    // Both titles should be present (ordering depends on same-second insertion)
    const titles = convs.map((c) => c.title)
    expect(titles).toContain('First chat')
    expect(titles).toContain('Second chat')
  })

  it('should save and load messages for a conversation', () => {
    const convId = saveConversation({ title: 'Test', model: 'deepseek-chat' })

    const msgId1 = saveMessage({
      conversation_id: convId,
      role: 'user',
      content: 'Hello',
      timestamp: 1000,
    })
    const msgId2 = saveMessage({
      conversation_id: convId,
      role: 'assistant',
      content: 'Hi there!',
      timestamp: 2000,
      model: 'deepseek-chat',
    })

    expect(msgId1).toBe(1)
    expect(msgId2).toBe(2)

    const messages = getMessages(convId)
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Hello')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('Hi there!')
  })

  it('should not mix messages across conversations', () => {
    const conv1 = saveConversation({ title: 'Conv1', model: 'a' })
    const conv2 = saveConversation({ title: 'Conv2', model: 'b' })

    saveMessage({ conversation_id: conv1, role: 'user', content: 'msg1', timestamp: 1 })
    saveMessage({ conversation_id: conv2, role: 'user', content: 'msg2', timestamp: 2 })

    expect(getMessages(conv1)).toHaveLength(1)
    expect(getMessages(conv2)).toHaveLength(1)
    expect(getMessages(conv1)[0].content).toBe('msg1')
    expect(getMessages(conv2)[0].content).toBe('msg2')
  })

  it('should return empty array for nonexistent conversation', () => {
    expect(getMessages(999)).toHaveLength(0)
  })
})
