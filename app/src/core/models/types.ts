/**
 * Multi-model router types
 * Supports Claude API, Ollama, and any OpenAI-compatible endpoint
 */

export type ModelProvider = 'anthropic' | 'ollama' | 'openai-compatible'

export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  model: string
  apiKey?: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string
}

export interface StreamChunk {
  type: 'text' | 'tool_use' | 'error' | 'done'
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
}

export interface ModelResponse {
  content: string
  model: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  stopReason?: string
}

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 8192,
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4096,
  },
  {
    id: 'ollama-default',
    name: 'Ollama Local',
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    maxTokens: 4096,
  },
]
