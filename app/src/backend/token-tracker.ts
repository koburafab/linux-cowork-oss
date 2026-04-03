/**
 * Token usage tracker — records token consumption and cost per model
 */

export interface TokenUsage {
  model: string
  inputTokens: number
  outputTokens: number
  cost: number // USD
  timestamp: number
  conversationId?: number
}

// Pricing per million tokens (input / output)
const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'kimi-k2.5': { input: 0.07, output: 0.28 },
  'claude-sonnet-4-5-20250514': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'llama3.2:1b': { input: 0, output: 0 }, // local = free
}

function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

export class TokenTracker {
  private usages: TokenUsage[] = []

  record(model: string, inputTokens: number, outputTokens: number, conversationId?: number): void {
    const cost = computeCost(model, inputTokens, outputTokens)
    this.usages.push({
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: Date.now(),
      conversationId,
    })
  }

  getTotalTokens(): { input: number; output: number } {
    let input = 0
    let output = 0
    for (const u of this.usages) {
      input += u.inputTokens
      output += u.outputTokens
    }
    return { input, output }
  }

  getTotalCost(): number {
    let total = 0
    for (const u of this.usages) {
      total += u.cost
    }
    return total
  }

  getUsageByModel(): Record<string, { tokens: number; cost: number }> {
    const byModel: Record<string, { tokens: number; cost: number }> = {}
    for (const u of this.usages) {
      if (!byModel[u.model]) {
        byModel[u.model] = { tokens: 0, cost: 0 }
      }
      byModel[u.model].tokens += u.inputTokens + u.outputTokens
      byModel[u.model].cost += u.cost
    }
    return byModel
  }

  getRecent(limit = 20): TokenUsage[] {
    return this.usages.slice(-limit)
  }

  toJSON(): object {
    const totals = this.getTotalTokens()
    return {
      totalInputTokens: totals.input,
      totalOutputTokens: totals.output,
      totalCost: this.getTotalCost(),
      byModel: this.getUsageByModel(),
      recent: this.getRecent(),
    }
  }
}

export const tokenTracker = new TokenTracker()
