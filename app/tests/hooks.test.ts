import { describe, it, expect, beforeEach } from 'vitest'
import { HookEngine, type HookContext, type HookResult } from '../src/core/hooks/engine'

describe('HookEngine', () => {
  let engine: HookEngine

  beforeEach(() => {
    engine = new HookEngine()
  })

  describe('registerHook', () => {
    it('should register a hook', () => {
      engine.registerHook({
        id: 'test-hook',
        event: 'user_message',
        handler: async () => ({ allow: true }),
      })

      expect(engine.listHooks()).toContain('test-hook')
    })

    it('should throw on duplicate id', () => {
      engine.registerHook({
        id: 'dup',
        event: 'user_message',
        handler: async () => ({ allow: true }),
      })

      expect(() =>
        engine.registerHook({
          id: 'dup',
          event: 'error',
          handler: async () => ({ allow: true }),
        }),
      ).toThrow("Hook with id 'dup' already registered")
    })
  })

  describe('emit', () => {
    it('should execute matching hooks and return allow=true', async () => {
      const calls: string[] = []

      engine.registerHook({
        id: 'h1',
        event: 'user_message',
        handler: async () => {
          calls.push('h1')
          return { allow: true }
        },
      })
      engine.registerHook({
        id: 'h2',
        event: 'user_message',
        handler: async () => {
          calls.push('h2')
          return { allow: true }
        },
      })

      const ctx: HookContext = {
        event: 'user_message',
        data: { text: 'hello' },
        timestamp: Date.now(),
      }
      const result = await engine.emit('user_message', ctx)

      expect(result.allow).toBe(true)
      expect(calls).toEqual(['h1', 'h2'])
    })

    it('should not execute hooks for other events', async () => {
      let called = false

      engine.registerHook({
        id: 'other',
        event: 'error',
        handler: async () => {
          called = true
          return { allow: true }
        },
      })

      const ctx: HookContext = {
        event: 'user_message',
        data: {},
        timestamp: Date.now(),
      }
      await engine.emit('user_message', ctx)

      expect(called).toBe(false)
    })

    it('should stop on first blocking hook', async () => {
      const calls: string[] = []

      engine.registerHook({
        id: 'blocker',
        event: 'pre_tool_use',
        handler: async () => {
          calls.push('blocker')
          return { allow: false, reason: 'denied' }
        },
      })
      engine.registerHook({
        id: 'after',
        event: 'pre_tool_use',
        handler: async () => {
          calls.push('after')
          return { allow: true }
        },
      })

      const ctx: HookContext = {
        event: 'pre_tool_use',
        data: {},
        timestamp: Date.now(),
      }
      const result = await engine.emit('pre_tool_use', ctx)

      expect(result.allow).toBe(false)
      expect(result.reason).toBe('denied')
      expect(calls).toEqual(['blocker'])
    })

    it('should return allow=true when no hooks registered', async () => {
      const ctx: HookContext = {
        event: 'session_start',
        data: {},
        timestamp: Date.now(),
      }
      const result = await engine.emit('session_start', ctx)
      expect(result.allow).toBe(true)
    })
  })

  describe('removeHook', () => {
    it('should remove an existing hook', () => {
      engine.registerHook({
        id: 'removeme',
        event: 'error',
        handler: async () => ({ allow: true }),
      })

      expect(engine.removeHook('removeme')).toBe(true)
      expect(engine.listHooks()).not.toContain('removeme')
    })

    it('should return false for non-existent hook', () => {
      expect(engine.removeHook('nope')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all hooks', () => {
      engine.registerHook({
        id: 'a',
        event: 'error',
        handler: async () => ({ allow: true }),
      })
      engine.registerHook({
        id: 'b',
        event: 'user_message',
        handler: async () => ({ allow: true }),
      })

      engine.clear()
      expect(engine.listHooks()).toEqual([])
    })
  })
})
