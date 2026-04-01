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
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | ContentBlock[]
  timestamp: number
  model?: string
  /** OpenAI-format tool calls attached to an assistant message */
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  /** For role:'tool' messages (OpenAI format) */
  tool_call_id?: string
}

export interface StreamChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'done'
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolUseId?: string
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export interface ToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface ToolResult {
  tool_use_id: string
  content: string | ContentBlock[]
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
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'openai-compatible',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    maxTokens: 8192,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'openai-compatible',
    model: 'deepseek-reasoner',
    baseUrl: 'https://api.deepseek.com',
    maxTokens: 8192,
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    provider: 'openai-compatible',
    model: 'kimi-k2',
    baseUrl: 'https://api.moonshot.cn',
    maxTokens: 8192,
  },
  {
    id: 'ollama-default',
    name: 'Ollama Local',
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    maxTokens: 4096,
  },
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
]
