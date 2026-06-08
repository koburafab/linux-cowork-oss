/**
 * Multi-model router
 * Routes requests to the appropriate provider (Anthropic, Ollama, OpenAI-compatible)
 */

import Anthropic from "@anthropic-ai/sdk";
import { tokenTracker } from "../../backend/token-tracker";
import type {
	ChatMessage,
	ModelConfig,
	ModelResponse,
	StreamChunk,
	ToolDefinition,
} from "./types";

export class ModelRouter {
	private anthropicClients: Map<string, Anthropic> = new Map();

	async chat(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): Promise<ModelResponse> {
		switch (config.provider) {
			case "anthropic":
				return this.chatAnthropic(config, messages, tools);
			case "ollama":
			case "openai-compatible":
				return this.chatOpenAICompatible(config, messages, tools);
			case "claude-cli":
				return this.chatCliProvider(config, messages, "claude");
			case "codex-cli":
				return this.chatCliProvider(config, messages, "codex");
			default:
				throw new Error(`Unknown provider: ${config.provider}`);
		}
	}

	async *stream(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): AsyncGenerator<StreamChunk> {
		switch (config.provider) {
			case "anthropic":
				yield* this.streamAnthropic(config, messages, tools);
				break;
			case "ollama":
			case "openai-compatible":
				yield* this.streamOpenAICompatible(config, messages, tools);
				break;
			case "claude-cli":
				yield* this.streamCliProvider(config, messages, "claude");
				break;
			case "codex-cli":
				yield* this.streamCliProvider(config, messages, "codex");
				break;
			default:
				throw new Error(`Unknown provider: ${config.provider}`);
		}
	}

	// --- Anthropic ---

	private getAnthropicClient(config: ModelConfig): Anthropic {
		const key = config.apiKey || "default";
		if (!this.anthropicClients.has(key)) {
			this.anthropicClients.set(key, new Anthropic({ apiKey: config.apiKey }));
		}
		return this.anthropicClients.get(key)!;
	}

	private async chatAnthropic(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): Promise<ModelResponse> {
		const client = this.getAnthropicClient(config);
		const { system, formatted } = this.formatForAnthropic(messages);

		const createParams = {
			model: config.model,
			max_tokens: config.maxTokens || 4096,
			temperature: config.temperature,
			// Prompt caching: cache the (stable) system prompt -> up to 90% cheaper/faster on repeat
			system: system
				? [
						{
							type: "text" as const,
							text: system,
							cache_control: { type: "ephemeral" as const },
						},
					]
				: undefined,
			messages: formatted,
			...(tools && tools.length > 0
				? { tools: tools as Anthropic.Messages.Tool[] }
				: {}),
		};

		const response = await client.messages.create(createParams);

		const text = response.content
			.filter((block): block is Anthropic.TextBlock => block.type === "text")
			.map((block) => block.text)
			.join("");

		tokenTracker.record(
			config.model,
			response.usage.input_tokens,
			response.usage.output_tokens,
		);

		return {
			content: text,
			model: response.model,
			usage: {
				inputTokens: response.usage.input_tokens,
				outputTokens: response.usage.output_tokens,
			},
			stopReason: response.stop_reason || undefined,
		};
	}

	private async *streamAnthropic(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): AsyncGenerator<StreamChunk> {
		const client = this.getAnthropicClient(config);
		const { system, formatted } = this.formatForAnthropic(messages);

		const streamParams = {
			model: config.model,
			max_tokens: config.maxTokens || 4096,
			temperature: config.temperature,
			// Prompt caching: cache the (stable) system prompt -> up to 90% cheaper/faster on repeat
			system: system
				? [
						{
							type: "text" as const,
							text: system,
							cache_control: { type: "ephemeral" as const },
						},
					]
				: undefined,
			messages: formatted,
			...(tools && tools.length > 0
				? { tools: tools as Anthropic.Messages.Tool[] }
				: {}),
		};

		const stream = client.messages.stream(streamParams);

		let currentToolName = "";
		let currentToolUseId = "";
		let currentToolInputJson = "";
		let streamUsage: { inputTokens: number; outputTokens: number } | undefined;

		for await (const event of stream) {
			if (event.type === "content_block_start") {
				const block = (
					event as unknown as {
						content_block: { type: string; name?: string; id?: string };
					}
				).content_block;
				if (block.type === "tool_use") {
					currentToolName = block.name || "";
					currentToolUseId = block.id || "";
					currentToolInputJson = "";
				}
			} else if (
				event.type === "content_block_delta" &&
				event.delta.type === "text_delta"
			) {
				yield { type: "text", content: event.delta.text };
			} else if (
				event.type === "content_block_delta" &&
				(event.delta as unknown as { type: string }).type === "input_json_delta"
			) {
				currentToolInputJson += (
					event.delta as unknown as { partial_json: string }
				).partial_json;
			} else if (event.type === "content_block_stop" && currentToolName) {
				let toolInput: Record<string, unknown> = {};
				try {
					toolInput = JSON.parse(currentToolInputJson || "{}");
				} catch {
					// malformed JSON
				}
				yield {
					type: "tool_use",
					content: "",
					toolName: currentToolName,
					toolInput,
					toolUseId: currentToolUseId,
				};
				currentToolName = "";
				currentToolUseId = "";
				currentToolInputJson = "";
			} else if (event.type === "message_delta") {
				const delta = event as unknown as { usage?: { output_tokens: number } };
				if (delta.usage) {
					streamUsage = {
						inputTokens: streamUsage?.inputTokens ?? 0,
						outputTokens: delta.usage.output_tokens,
					};
				}
			} else if (event.type === "message_start") {
				const msg = (
					event as unknown as {
						message?: {
							usage?: { input_tokens: number; output_tokens: number };
						};
					}
				).message;
				if (msg?.usage) {
					streamUsage = {
						inputTokens: msg.usage.input_tokens,
						outputTokens: msg.usage.output_tokens,
					};
				}
			}
		}

		if (streamUsage) {
			tokenTracker.record(
				config.model,
				streamUsage.inputTokens,
				streamUsage.outputTokens,
			);
		}

		yield { type: "done", content: "", usage: streamUsage };
	}

	private formatForAnthropic(messages: ChatMessage[]): {
		system: string;
		formatted: Array<{ role: "user" | "assistant"; content: string }>;
	} {
		let system = "";
		const formatted: Array<{ role: "user" | "assistant"; content: string }> =
			[];

		for (const msg of messages) {
			if (msg.role === "system") {
				system +=
					(system ? "\n" : "") +
					(typeof msg.content === "string"
						? msg.content
						: JSON.stringify(msg.content));
			} else if (msg.role === "user" || msg.role === "assistant") {
				const content =
					typeof msg.content === "string"
						? msg.content
						: JSON.stringify(msg.content);
				formatted.push({ role: msg.role, content });
			}
			// Skip role:'tool' messages — they should not appear in Anthropic format
			// (Anthropic tool results are embedded in user messages)
		}

		return { system, formatted };
	}

	// --- Subscription CLI providers (Claude Code / Codex) ---

	/**
	 * Flatten messages into a single text prompt + extracted system prompt.
	 * v1: stateless — the whole conversation is replayed each turn.
	 */
	private buildCliPrompt(messages: ChatMessage[]): {
		system: string;
		prompt: string;
	} {
		let system = "";
		const turns: string[] = [];
		for (const msg of messages) {
			const content =
				typeof msg.content === "string"
					? msg.content
					: JSON.stringify(msg.content);
			if (msg.role === "system") {
				system += (system ? "\n" : "") + content;
			} else if (msg.role === "user") {
				turns.push(`User: ${content}`);
			} else if (msg.role === "assistant") {
				turns.push(`Assistant: ${content}`);
			}
		}
		return { system, prompt: turns.join("\n\n") };
	}

	/**
	 * Drive the `claude` or `codex` CLI as a backend, using the user's subscription
	 * (OAuth / ChatGPT login) instead of an API key. config.agent === true lets the
	 * CLI use its own tools to act; otherwise it runs as a plain text generator.
	 */
	private async *streamCliProvider(
		config: ModelConfig,
		messages: ChatMessage[],
		cli: "claude" | "codex",
	): AsyncGenerator<StreamChunk> {
		const agent = config.agent === true;
		const { system, prompt } = this.buildCliPrompt(messages);
		const home = process.env.HOME || "";
		// Restrict agent file actions to a dedicated workspace
		const workdir = `${home}/linux-cowork-oss`;
		const env = {
			...process.env,
			PATH: `${home}/.local/bin:${home}/.bun/bin:${process.env.PATH || ""}`,
		};

		let cmd: string[];
		if (cli === "claude") {
			cmd = [
				"claude",
				"-p",
				prompt,
				"--output-format",
				"stream-json",
				"--verbose",
				"--model",
				config.model,
			];
			if (system) cmd.push("--append-system-prompt", system);
			if (agent) {
				cmd.push(
					"--permission-mode",
					"bypassPermissions",
					"--add-dir",
					workdir,
				);
			} else {
				cmd.push("--tools", ""); // no tools = pure text generation
			}
		} else {
			// codex has no --system flag → fold system into the prompt
			const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
			cmd = [
				`${home}/.local/bin/codex`,
				"exec",
				fullPrompt,
				"--json",
				"--skip-git-repo-check",
				"--sandbox",
				agent ? "workspace-write" : "read-only",
			];
			if (agent) cmd.push("--cd", workdir);
			if (config.model && config.model !== "default")
				cmd.push("--model", config.model);
		}

		let proc: ReturnType<typeof Bun.spawn>;
		try {
			proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", env });
		} catch (err) {
			yield {
				type: "error",
				content: `Impossible de lancer ${cli}: ${err instanceof Error ? err.message : String(err)}`,
			};
			return;
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let usage: { inputTokens: number; outputTokens: number } | undefined;
		const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed.startsWith("{")) continue;
				let evt: Record<string, unknown>;
				try {
					evt = JSON.parse(trimmed);
				} catch {
					continue;
				}
				if (cli === "claude") {
					// claude --output-format stream-json emits whole assistant messages
					if (evt.type === "assistant") {
						const msg = (
							evt as { message?: { content?: Array<Record<string, unknown>> } }
						).message;
						for (const block of msg?.content || []) {
							if (block.type === "text" && typeof block.text === "string") {
								yield { type: "text", content: block.text };
							} else if (block.type === "tool_use") {
								yield {
									type: "tool_use",
									content: "",
									toolName: String(block.name || ""),
									toolInput: (block.input as Record<string, unknown>) || {},
									toolUseId: String(block.id || ""),
								};
							}
						}
					} else if (evt.type === "result") {
						const u = (
							evt as { usage?: { input_tokens: number; output_tokens: number } }
						).usage;
						if (u)
							usage = {
								inputTokens: u.input_tokens,
								outputTokens: u.output_tokens,
							};
					}
				} else {
					// codex exec --json emits JSONL events
					const item = (evt as { item?: Record<string, unknown> }).item;
					if (evt.type === "item.completed" && item) {
						if (
							item.type === "agent_message" &&
							typeof item.text === "string"
						) {
							yield { type: "text", content: item.text };
						} else if (item.type === "command_execution" && item.command) {
							yield {
								type: "tool_use",
								content: "",
								toolName: "bash",
								toolInput: { command: String(item.command) },
								toolUseId: String(item.id || ""),
							};
						}
					} else if (evt.type === "turn.completed") {
						const u = (
							evt as { usage?: { input_tokens: number; output_tokens: number } }
						).usage;
						if (u)
							usage = {
								inputTokens: u.input_tokens,
								outputTokens: u.output_tokens,
							};
					}
				}
			}
		}

		const exitCode = await proc.exited;
		if (exitCode !== 0) {
			const errText = await new Response(
				proc.stderr as ReadableStream<Uint8Array>,
			).text();
			const hint =
				cli === "codex"
					? " (connecte-toi avec `codex login`)"
					: " (lance `claude` une fois pour te connecter)";
			yield {
				type: "error",
				content: `${cli} a échoué (code ${exitCode})${hint}: ${errText.slice(0, 400)}`,
			};
		}
		if (usage)
			tokenTracker.record(config.model, usage.inputTokens, usage.outputTokens);
		yield { type: "done", content: "", usage };
	}

	private async chatCliProvider(
		config: ModelConfig,
		messages: ChatMessage[],
		cli: "claude" | "codex",
	): Promise<ModelResponse> {
		let content = "";
		let usage: { inputTokens: number; outputTokens: number } | undefined;
		for await (const chunk of this.streamCliProvider(config, messages, cli)) {
			if (chunk.type === "text") content += chunk.content;
			else if (chunk.type === "done") usage = chunk.usage;
		}
		return { content, model: config.model, usage };
	}

	// --- OpenAI Compatible (Ollama, Grok, etc.) ---

	/**
	 * Convert ToolDefinition[] (Anthropic format) to OpenAI function-calling format
	 */
	private toOpenAITools(tools: ToolDefinition[]): Array<{
		type: "function";
		function: {
			name: string;
			description: string;
			parameters: Record<string, unknown>;
		};
	}> {
		return tools.map((t) => ({
			type: "function" as const,
			function: {
				name: t.name,
				description: t.description,
				parameters: t.input_schema,
			},
		}));
	}

	/**
	 * Format ChatMessage[] for OpenAI-compatible APIs.
	 * Handles role:'tool' messages and tool_calls on assistant messages.
	 */
	private formatForOpenAI(
		messages: ChatMessage[],
	): Array<Record<string, unknown>> {
		return messages.map((m) => {
			// For vision: if content is a JSON string containing image_url, parse it back to array
			let content: unknown = m.content;
			if (typeof m.content === "string") {
				try {
					const parsed = JSON.parse(m.content);
					if (
						Array.isArray(parsed) &&
						parsed.some((p: Record<string, unknown>) => p.type === "image_url")
					) {
						content = parsed; // Keep as array for vision models
					}
				} catch {
					// Not JSON, keep as string
				}
			} else if (Array.isArray(m.content)) {
				content = m.content;
			}
			const msg: Record<string, unknown> = {
				role: m.role,
				content,
			};
			if (m.role === "tool" && m.tool_call_id) {
				msg.tool_call_id = m.tool_call_id;
			}
			if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
				msg.tool_calls = m.tool_calls;
			}
			return msg;
		});
	}

	private async chatOpenAICompatible(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): Promise<ModelResponse> {
		const baseUrl = config.baseUrl || "http://localhost:11434";
		const url = `${baseUrl}/v1/chat/completions`;

		const body: Record<string, unknown> = {
			model: config.model,
			messages: this.formatForOpenAI(messages),
			max_tokens: config.maxTokens || 4096,
			temperature: config.temperature,
			stream: false,
		};

		if (tools && tools.length > 0) {
			body.tools = this.toOpenAITools(tools);
		}

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			throw new Error(`API error ${response.status}: ${await response.text()}`);
		}

		const data = (await response.json()) as {
			choices: Array<{
				message: {
					content: string | null;
					tool_calls?: Array<{
						id: string;
						type: "function";
						function: { name: string; arguments: string };
					}>;
				};
			}>;
			model: string;
			usage?: { prompt_tokens: number; completion_tokens: number };
		};

		if (data.usage) {
			tokenTracker.record(
				config.model,
				data.usage.prompt_tokens,
				data.usage.completion_tokens,
			);
		}

		return {
			content: data.choices[0]?.message?.content || "",
			model: data.model,
			usage: data.usage
				? {
						inputTokens: data.usage.prompt_tokens,
						outputTokens: data.usage.completion_tokens,
					}
				: undefined,
		};
	}

	private async *streamOpenAICompatible(
		config: ModelConfig,
		messages: ChatMessage[],
		tools?: ToolDefinition[],
	): AsyncGenerator<StreamChunk> {
		const baseUrl = config.baseUrl || "http://localhost:11434";
		const url = `${baseUrl}/v1/chat/completions`;

		const reqBody: Record<string, unknown> = {
			model: config.model,
			messages: this.formatForOpenAI(messages),
			max_tokens: config.maxTokens || 4096,
			temperature: config.temperature,
			stream: true,
			stream_options: { include_usage: true },
		};

		if (tools && tools.length > 0) {
			reqBody.tools = this.toOpenAITools(tools);
		}

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
			},
			body: JSON.stringify(reqBody),
		});

		if (!response.ok) {
			yield {
				type: "error",
				content: `API error ${response.status}: ${await response.text()}`,
			};
			return;
		}

		const reader = response.body?.getReader();
		if (!reader) return;

		const decoder = new TextDecoder();
		let buffer = "";
		let streamUsage: { inputTokens: number; outputTokens: number } | undefined;

		// Accumulate tool calls across streaming deltas
		// OpenAI streams tool_calls as: delta.tool_calls[{index, id?, function:{name?, arguments?}}]
		const pendingToolCalls: Map<
			number,
			{ id: string; name: string; arguments: string }
		> = new Map();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const data = line.slice(6).trim();
				if (data === "[DONE]") {
					// Emit any accumulated tool calls before done
					for (const [, tc] of pendingToolCalls) {
						let toolInput: Record<string, unknown> = {};
						try {
							toolInput = JSON.parse(tc.arguments || "{}");
						} catch {
							// malformed JSON from model
						}
						yield {
							type: "tool_use",
							content: "",
							toolName: tc.name,
							toolInput,
							toolUseId: tc.id,
						};
					}
					if (streamUsage) {
						tokenTracker.record(
							config.model,
							streamUsage.inputTokens,
							streamUsage.outputTokens,
						);
					}
					yield { type: "done", content: "", usage: streamUsage };
					return;
				}
				try {
					const parsed = JSON.parse(data) as {
						choices: Array<{
							delta: {
								content?: string;
								tool_calls?: Array<{
									index: number;
									id?: string;
									function?: { name?: string; arguments?: string };
								}>;
							};
							finish_reason?: string | null;
						}>;
						usage?: { prompt_tokens: number; completion_tokens: number };
					};

					// Capture usage if present (often in the last chunk)
					if (parsed.usage) {
						streamUsage = {
							inputTokens: parsed.usage.prompt_tokens,
							outputTokens: parsed.usage.completion_tokens,
						};
					}

					const delta = parsed.choices[0]?.delta;

					// Handle text content
					if (delta?.content) {
						yield { type: "text", content: delta.content };
					}

					// Handle tool call deltas
					if (delta?.tool_calls) {
						for (const tc of delta.tool_calls) {
							const idx = tc.index;
							if (!pendingToolCalls.has(idx)) {
								pendingToolCalls.set(idx, { id: "", name: "", arguments: "" });
							}
							const entry = pendingToolCalls.get(idx)!;
							if (tc.id) entry.id = tc.id;
							if (tc.function?.name) entry.name = tc.function.name;
							if (tc.function?.arguments)
								entry.arguments += tc.function.arguments;
						}
					}

					// Check finish_reason — some APIs send 'tool_calls' or 'stop' as finish_reason
					const finishReason = parsed.choices[0]?.finish_reason;
					if (finishReason === "tool_calls") {
						for (const [, tc] of pendingToolCalls) {
							let toolInput: Record<string, unknown> = {};
							try {
								toolInput = JSON.parse(tc.arguments || "{}");
							} catch {
								// malformed
							}
							yield {
								type: "tool_use",
								content: "",
								toolName: tc.name,
								toolInput,
								toolUseId: tc.id,
							};
						}
						pendingToolCalls.clear();
					}
				} catch {
					// skip malformed chunks
				}
			}
		}

		// Emit any remaining tool calls if stream ended without [DONE]
		for (const [, tc] of pendingToolCalls) {
			let toolInput: Record<string, unknown> = {};
			try {
				toolInput = JSON.parse(tc.arguments || "{}");
			} catch {
				// malformed
			}
			yield {
				type: "tool_use",
				content: "",
				toolName: tc.name,
				toolInput,
				toolUseId: tc.id,
			};
		}

		if (streamUsage) {
			tokenTracker.record(
				config.model,
				streamUsage.inputTokens,
				streamUsage.outputTokens,
			);
		}
		yield { type: "done", content: "", usage: streamUsage };
	}
}

// Singleton
export const modelRouter = new ModelRouter();
