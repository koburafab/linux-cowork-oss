/**
 * Tests for memory CRUD and tool registry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  initDB,
  closeDB,
  saveMemory,
  getMemories,
  deleteMemory,
} from '../src/core/memory/db'
import { createDefaultRegistry } from '../src/backend/tool-registry'

describe('Memories', () => {
  beforeEach(() => {
    initDB(':memory:')
  })

  afterEach(() => {
    closeDB()
  })

  it('should save and retrieve memories', () => {
    const id = saveMemory({ type: 'user', name: 'test', content: 'User likes dark mode' })
    expect(id).toBe(1)

    const memories = getMemories()
    expect(memories).toHaveLength(1)
    expect(memories[0].content).toBe('User likes dark mode')
    expect(memories[0].type).toBe('user')
  })

  it('should filter memories by type', () => {
    saveMemory({ type: 'user', name: 'a', content: 'fact A' })
    saveMemory({ type: 'project', name: 'b', content: 'fact B' })
    saveMemory({ type: 'user', name: 'c', content: 'fact C' })

    const userMemories = getMemories('user')
    expect(userMemories).toHaveLength(2)

    const projectMemories = getMemories('project')
    expect(projectMemories).toHaveLength(1)
    expect(projectMemories[0].content).toBe('fact B')
  })

  it('should delete a memory', () => {
    const id = saveMemory({ type: 'user', name: 'test', content: 'to delete' })
    expect(getMemories()).toHaveLength(1)

    const deleted = deleteMemory(id)
    expect(deleted).toBe(true)
    expect(getMemories()).toHaveLength(0)
  })

  it('should return false when deleting nonexistent memory', () => {
    const deleted = deleteMemory(999)
    expect(deleted).toBe(false)
  })
})

describe('Memory tools in registry', () => {
  it('should have save_memory tool registered', () => {
    const registry = createDefaultRegistry()
    const tool = registry.get('save_memory')
    expect(tool).toBeDefined()
    expect(tool!.definition.name).toBe('save_memory')
    expect(tool!.definition.input_schema.required).toContain('content')
  })

  it('should have recall_memories tool registered', () => {
    const registry = createDefaultRegistry()
    const tool = registry.get('recall_memories')
    expect(tool).toBeDefined()
    expect(tool!.definition.name).toBe('recall_memories')
  })

  it('save_memory executor should persist to DB', async () => {
    initDB(':memory:')
    try {
      const registry = createDefaultRegistry()
      const tool = registry.get('save_memory')!
      const result = await tool.executor({ content: 'Fab is the user' })
      expect(result).toContain('Saved memory')

      const memories = getMemories()
      expect(memories).toHaveLength(1)
      expect(memories[0].content).toBe('Fab is the user')
    } finally {
      closeDB()
    }
  })

  it('recall_memories executor should return saved memories', async () => {
    initDB(':memory:')
    try {
      const registry = createDefaultRegistry()
      saveMemory({ type: 'user', name: 'test', content: 'Remember this' })

      const tool = registry.get('recall_memories')!
      const result = await tool.executor({})
      expect(result).toContain('Remember this')
    } finally {
      closeDB()
    }
  })
})
