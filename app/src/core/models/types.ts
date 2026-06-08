/**
 * Multi-model router types
 * Supports Claude API, Ollama, and any OpenAI-compatible endpoint
 */

export type ModelProvider =
	| "anthropic"
	| "ollama"
	| "openai-compatible"
	| "claude-cli"
	| "codex-cli";

export interface ModelConfig {
	id: string;
	name: string;
	provider: ModelProvider;
	model: string;
	apiKey?: string;
	baseUrl?: string;
	maxTokens?: number;
	temperature?: number;
	/** false for subscription/CLI providers that need no API key (drives the UI) */
	requiresApiKey?: boolean;
	/** Transient flag set per-request: true = let the CLI act as an agent (use its tools) */
	agent?: boolean;
}

export interface ChatMessage {
	role: "user" | "assistant" | "system" | "tool";
	content: string | ContentBlock[];
	timestamp: number;
	model?: string;
	/** OpenAI-format tool calls attached to an assistant message */
	tool_calls?: Array<{
		id: string;
		type: "function";
		function: { name: string; arguments: string };
	}>;
	/** For role:'tool' messages (OpenAI format) */
	tool_call_id?: string;
}

export interface StreamChunk {
	type: "text" | "tool_use" | "tool_result" | "error" | "done";
	content: string;
	toolName?: string;
	toolInput?: Record<string, unknown>;
	toolUseId?: string;
	usage?: { inputTokens: number; outputTokens: number };
}

export type ContentBlock =
	| { type: "text"; text: string }
	| {
			type: "image";
			source: { type: "base64"; media_type: string; data: string };
	  };

export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: Record<string, unknown>;
}

export interface ToolResult {
	tool_use_id: string;
	content: string | ContentBlock[];
}

export interface ModelResponse {
	content: string;
	model: string;
	usage?: {
		inputTokens: number;
		outputTokens: number;
	};
	stopReason?: string;
}

export const DEFAULT_MODELS: ModelConfig[] = [
	// --- Abonnements via CLI (pas de cle API, pilote le CLI local en sous-processus) ---
	// Claude Code CLI (abonnement Max, auth OAuth dans ~/.claude)
	{
		id: "claude-cli-sonnet",
		name: "Claude Sonnet (abo)",
		provider: "claude-cli",
		model: "sonnet",
		maxTokens: 8192,
		requiresApiKey: false,
	},
	{
		id: "claude-cli-opus",
		name: "Claude Opus (abo)",
		provider: "claude-cli",
		model: "opus",
		maxTokens: 8192,
		requiresApiKey: false,
	},
	// Codex CLI (abonnement ChatGPT) — model 'default' = laisse le defaut du compte
	{
		id: "codex-cli",
		name: "Codex (abo ChatGPT)",
		provider: "codex-cli",
		model: "default",
		maxTokens: 8192,
		requiresApiKey: false,
	},
	// Prefix caching automatique, 95% reduction sur cache hits
	{
		id: "deepseek-chat",
		name: "DeepSeek Chat",
		provider: "openai-compatible",
		model: "deepseek-chat",
		baseUrl: "https://api.deepseek.com",
		maxTokens: 8192,
		temperature: 0.3, // deterministe pour agents
	},
	{
		id: "deepseek-reasoner",
		name: "DeepSeek Reasoner",
		provider: "openai-compatible",
		model: "deepseek-reasoner",
		baseUrl: "https://api.deepseek.com",
		maxTokens: 8192,
	},
	// 256K context, vision native, cache automatique 75% reduction
	// Ne PAS mettre les built-in tools dans le system prompt (Kimi decide seul)
	{
		id: "kimi-k2",
		name: "Kimi K2.5",
		provider: "openai-compatible",
		model: "kimi-k2.5",
		baseUrl: "https://api.moonshot.ai",
		maxTokens: 8192,
		temperature: 0.6, // mode instant, pas thinking
	},
	// OpenAI GPT-5 — vision native, necessite la cle OpenAI
	{
		id: "gpt-5.5",
		name: "GPT-5.5",
		provider: "openai-compatible",
		model: "gpt-5.5",
		baseUrl: "https://api.openai.com",
		maxTokens: 8192,
		temperature: 0.3,
	},
	{
		// mini taille pour coding / computer-use / subagents — ideal pour cette app
		id: "gpt-5.4-mini",
		name: "GPT-5.4 mini",
		provider: "openai-compatible",
		model: "gpt-5.4-mini",
		baseUrl: "https://api.openai.com",
		maxTokens: 8192,
		temperature: 0.3,
	},
	{
		// le moins cher de la classe GPT-5.4, pour le volume
		id: "gpt-5.4-nano",
		name: "GPT-5.4 nano",
		provider: "openai-compatible",
		model: "gpt-5.4-nano",
		baseUrl: "https://api.openai.com",
		maxTokens: 8192,
		temperature: 0.3,
	},
	{
		id: "ollama-default",
		name: "Ollama Local (1B)",
		provider: "ollama",
		model: "llama3.2:1b",
		baseUrl: "http://localhost:11434",
		maxTokens: 4096,
	},
	// Claude: temperature par defaut (non specifiee, laissee au provider)
	{
		id: "claude-sonnet",
		name: "Claude 4.5 Sonnet",
		provider: "anthropic",
		model: "claude-sonnet-4-5-20250514",
		maxTokens: 8192,
	},
	{
		id: "claude-haiku",
		name: "Claude Haiku 4.5",
		provider: "anthropic",
		model: "claude-haiku-4-5-20251001",
		maxTokens: 4096,
	},
];
