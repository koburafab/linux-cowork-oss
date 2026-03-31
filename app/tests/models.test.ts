import { describe, it, expect } from 'vitest'
import { ModelRouter } from '../src/core/models/router'
import { DEFAULT_MODELS } from '../src/core/models/types'
import type { ChatMessage, ModelConfig } from '../src/core/models/types'

describe('ModelRouter', () => {
  const router = new ModelRouter()

  describe('types', () => {
    it('should have default models defined', () => {
      expect(DEFAULT_MODELS).toBeDefined()
      expect(DEFAULT_MODELS.length).toBeGreaterThan(0)
    })

    it('should have anthropic model', () => {
      const anthropic = DEFAULT_MODELS.find((m) => m.provider === 'anthropic')
      expect(anthropic).toBeDefined()
      expect(anthropic!.model).toContain('claude')
    })

    it('should have ollama model', () => {
      const ollama = DEFAULT_MODELS.find((m) => m.provider === 'ollama')
      expect(ollama).toBeDefined()
      expect(ollama!.baseUrl).toContain('localhost')
    })
  })

  describe('router', () => {
    it('should throw on unknown provider', async () => {
      const config: ModelConfig = {
        id: 'test',
        name: 'Test',
        provider: 'unknown' as any,
        model: 'test',
      }
      const messages: ChatMessage[] = [
        { role: 'user', content: 'hello', timestamp: Date.now() },
      ]

      await expect(router.chat(config, messages)).rejects.toThrow(
        'Unknown provider',
      )
    })

    it('should throw on unknown provider for stream', async () => {
      const config: ModelConfig = {
        id: 'test',
        name: 'Test',
        provider: 'unknown' as any,
        model: 'test',
      }
      const messages: ChatMessage[] = [
        { role: 'user', content: 'hello', timestamp: Date.now() },
      ]

      const gen = router.stream(config, messages)
      await expect(gen.next()).rejects.toThrow('Unknown provider')
    })
  })

  describe('message formatting', () => {
    it('should create valid chat messages', () => {
      const msg: ChatMessage = {
        role: 'user',
        content: 'Hello world',
        timestamp: Date.now(),
      }
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('Hello world')
      expect(msg.timestamp).toBeGreaterThan(0)
    })

    it('should support system messages', () => {
      const msg: ChatMessage = {
        role: 'system',
        content: 'You are a helpful assistant',
        timestamp: Date.now(),
      }
      expect(msg.role).toBe('system')
    })
  })
})
