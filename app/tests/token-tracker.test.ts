import { describe, it, expect, beforeEach } from 'vitest'
import { TokenTracker } from '../src/backend/token-tracker'

describe('TokenTracker', () => {
  let tracker: TokenTracker

  beforeEach(() => {
    tracker = new TokenTracker()
  })

  it('records usage and returns total tokens', () => {
    tracker.record('deepseek-chat', 1000, 500)
    tracker.record('deepseek-chat', 2000, 1000)

    const totals = tracker.getTotalTokens()
    expect(totals.input).toBe(3000)
    expect(totals.output).toBe(1500)
  })

  it('computes total cost using pricing table', () => {
    // deepseek-chat: input $0.14/M, output $0.28/M
    tracker.record('deepseek-chat', 1_000_000, 1_000_000)

    const cost = tracker.getTotalCost()
    expect(cost).toBeCloseTo(0.14 + 0.28, 6)
  })

  it('returns zero cost for local models', () => {
    tracker.record('llama3.2:1b', 5000, 3000)

    expect(tracker.getTotalCost()).toBe(0)
  })

  it('returns zero cost for unknown models', () => {
    tracker.record('unknown-model', 5000, 3000)

    expect(tracker.getTotalCost()).toBe(0)
  })

  it('computes cost for Anthropic models', () => {
    // claude-sonnet-4-5-20250514: input $3.0/M, output $15.0/M
    tracker.record('claude-sonnet-4-5-20250514', 1000, 500)

    const cost = tracker.getTotalCost()
    // (1000 * 3.0 + 500 * 15.0) / 1_000_000 = (3000 + 7500) / 1_000_000 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it('groups usage by model', () => {
    tracker.record('deepseek-chat', 1000, 500)
    tracker.record('deepseek-chat', 2000, 1000)
    tracker.record('claude-sonnet-4-5-20250514', 500, 200)

    const byModel = tracker.getUsageByModel()

    expect(byModel['deepseek-chat'].tokens).toBe(4500) // 3000 + 1500
    expect(byModel['claude-sonnet-4-5-20250514'].tokens).toBe(700) // 500 + 200
    expect(byModel['deepseek-chat'].cost).toBeGreaterThan(0)
    expect(byModel['claude-sonnet-4-5-20250514'].cost).toBeGreaterThan(0)
  })

  it('returns recent usages with limit', () => {
    for (let i = 0; i < 30; i++) {
      tracker.record('deepseek-chat', 100, 50)
    }

    const recent = tracker.getRecent(10)
    expect(recent).toHaveLength(10)

    const allRecent = tracker.getRecent()
    expect(allRecent).toHaveLength(20) // default limit = 20
  })

  it('toJSON returns complete stats object', () => {
    tracker.record('deepseek-chat', 1000, 500)
    tracker.record('claude-haiku-4-5-20251001', 2000, 1000)

    const json = tracker.toJSON() as Record<string, unknown>

    expect(json).toHaveProperty('totalInputTokens', 3000)
    expect(json).toHaveProperty('totalOutputTokens', 1500)
    expect(json).toHaveProperty('totalCost')
    expect(json).toHaveProperty('byModel')
    expect(json).toHaveProperty('recent')
    expect((json.totalCost as number)).toBeGreaterThan(0)
    expect((json.recent as unknown[]).length).toBe(2)
  })

  it('stores conversationId when provided', () => {
    tracker.record('deepseek-chat', 100, 50, 42)

    const recent = tracker.getRecent(1)
    expect(recent[0].conversationId).toBe(42)
  })
})
