import { useState, useEffect, useCallback } from 'react'
import { getTokenUsage, type TokenUsageStats } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'

export function TokenCounter() {
  const [stats, setStats] = useState<TokenUsageStats | null>(null)
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)

  const refresh = useCallback(async () => {
    try {
      const data = await getTokenUsage()
      setStats(data)
    } catch {
      // backend not ready or endpoint missing
    }
  }, [])

  // Refresh after each message completes (when streaming stops)
  useEffect(() => {
    if (!isStreaming) {
      refresh()
    }
  }, [isStreaming, messages.length, refresh])

  if (!stats || (stats.totalInputTokens === 0 && stats.totalOutputTokens === 0)) {
    return null
  }

  return (
    <div className="token-counter">
      <span className="token-counter__tokens">
        Tokens: {formatNumber(stats.totalInputTokens)} in / {formatNumber(stats.totalOutputTokens)} out
      </span>
      <span className="token-counter__sep"> | </span>
      <span className="token-counter__cost">
        Cost: ${stats.totalCost.toFixed(4)}
      </span>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}
