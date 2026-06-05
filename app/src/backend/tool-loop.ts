/**
 * Tool-use loop — streams model output, executes tools, reboucles until done
 *
 * Supports both Anthropic and OpenAI-compatible (DeepSeek, Kimi, etc.) providers.
 * Tool results are formatted differently per provider:
 *   - Anthropic: {role:"user", content:[{type:"tool_result", tool_use_id, content}]}
 *   - OpenAI:    {role:"tool", tool_call_id, content}
 */

import { modelRouter, type ModelRouter } from '../core/models/router'
import type {
  ModelConfig,
  ChatMessage,
  ContentBlock,
} from '../core/models/types'
import type { ToolRegistry } from './tool-registry'
import { notify } from '../core/notifications'

export interface SSEEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'screenshot' | 'done' | 'error'
  content?: string
  name?: string
  input?: Record<string, unknown>
  result?: string | ContentBlock[]
  base64?: string
}

export interface ToolLoopOptions {
  maxIterations?: number
  timeoutMs?: number
  systemPrompt?: string
}

/**
 * System prompt structure: STABLE prefix first, VARIABLE suffix last.
 * This maximizes prefix cache hits on DeepSeek (prefix caching) and Kimi (auto cache).
 * The stable part (instructions + tool descriptions) rarely changes and stays at the top.
 * The variable part (memories, user context) is appended at the end.
 */
const DEFAULT_SYSTEM_PROMPT =
  // --- STABLE SECTION (cacheable prefix) ---
  'You are a helpful AI assistant on a Linux desktop with access to tools. ' +
  'Use the right tool for the job: web_search to find current/real-time info and web_fetch to read a page, ' +
  'bash for commands, read_file/write_file for files, system_info for system details. ' +
  'For anything time-sensitive or factual you are unsure of (news, weather, prices, versions), use web_search instead of saying you have no internet access. ' +
  'Only use screenshot and mouse/keyboard tools when the user explicitly asks you to interact with the GUI. ' +
  'You HAVE persistent memory via save_memory and recall_memories tools. ' +
  'Use save_memory to remember important facts about the user. ' +
  'Memories are automatically loaded into your context at the start of each conversation. ' +
  'You also have access to a SQLite database for conversations and audit logs. ' +
  'You are NOT stateless — you remember things between sessions.'

function isAnthropicProvider(config: ModelConfig): boolean {
  return config.provider === 'anthropic'
}

export async function* toolUseLoop(
  message: string,
  history: ChatMessage[],
  modelConfig: ModelConfig,
  toolRegistry: ToolRegistry,
  options?: ToolLoopOptions & { router?: ModelRouter },
): AsyncGenerator<SSEEvent> {
  const maxIterations = options?.maxIterations ?? 25
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000
  const systemPrompt = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  const router = options?.router ?? modelRouter
  const startTime = Date.now()
  const isAnthropic = isAnthropicProvider(modelConfig)

  const tools = toolRegistry.getDefinitions()

  // Build message history with system prompt
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt, timestamp: Date.now() },
    ...history,
    { role: 'user', content: message, timestamp: Date.now() },
  ]

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Check timeout
    if (Date.now() - startTime >= timeoutMs) {
      yield { type: 'error', content: 'Tool loop timeout exceeded' }
      return
    }

    // Collect chunks from the model stream
    const pendingToolCalls: Array<{
      toolName: string
      toolInput: Record<string, unknown>
      toolUseId: string
    }> = []
    let assistantText = ''

    try {
      const stream = router.stream(modelConfig, messages, tools)

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
          assistantText += chunk.content
          yield { type: 'text', content: chunk.content }
        } else if (chunk.type === 'tool_use') {
          pendingToolCalls.push({
            toolName: chunk.toolName || '',
            toolInput: chunk.toolInput || {},
            toolUseId: chunk.toolUseId || '',
          })
        } else if (chunk.type === 'error') {
          yield { type: 'error', content: chunk.content }
          return
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      yield { type: 'error', content: msg }
      return
    }

    // No tool calls — model is done
    if (pendingToolCalls.length === 0) {
      const summary = assistantText.slice(0, 80)
      notify('Linux Cowork', `Task completed: ${summary}`)
      yield { type: 'done' }
      return
    }

    // Add assistant message to context (with tool_calls for OpenAI format)
    if (isAnthropic) {
      // Anthropic: assistant message is just text; tool_use blocks are implicit
      messages.push({
        role: 'assistant',
        content: assistantText,
        timestamp: Date.now(),
      })
    } else {
      // OpenAI format: assistant message must include tool_calls array
      messages.push({
        role: 'assistant',
        content: assistantText || '',
        timestamp: Date.now(),
        tool_calls: pendingToolCalls.map((tc) => ({
          id: tc.toolUseId,
          type: 'function' as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.toolInput),
          },
        })),
      })
    }

    // Execute each tool and collect results
    for (const call of pendingToolCalls) {
      yield { type: 'tool_call', name: call.toolName, input: call.toolInput }

      const registeredTool = toolRegistry.get(call.toolName)
      if (!registeredTool) {
        const errorResult = `Error: unknown tool "${call.toolName}"`
        yield { type: 'tool_result', name: call.toolName, result: errorResult }
        appendToolResult(messages, call, errorResult, isAnthropic)
        continue
      }

      try {
        const result = await registeredTool.executor(call.toolInput)

        // Emit screenshot event with base64 if the tool returned an image
        if (call.toolName === 'screenshot' && Array.isArray(result)) {
          const imgBlock = result.find(
            (b): b is ContentBlock & { type: 'image' } => b.type === 'image',
          )
          if (imgBlock && imgBlock.type === 'image') {
            yield {
              type: 'screenshot',
              name: call.toolName,
              base64: imgBlock.source.data,
            }
          }
        }

        yield { type: 'tool_result', name: call.toolName, result }

        // For screenshot results with images, inject the image directly
        // so vision models (Kimi K2.5, Claude) can actually see it
        if (call.toolName === 'screenshot' && Array.isArray(result)) {
          const imgBlock = result.find(
            (b): b is ContentBlock & { type: 'image' } => b.type === 'image',
          )
          if (imgBlock && imgBlock.type === 'image' && !isAnthropic) {
            // OpenAI vision format: add image as user message
            messages.push({
              role: 'tool',
              content: 'Screenshot captured. See image below.',
              tool_call_id: call.toolUseId,
              timestamp: Date.now(),
            })
            messages.push({
              role: 'user',
              content: JSON.stringify([
                { type: 'text', text: 'Here is the screenshot. Describe what you see and decide what to do next.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imgBlock.source.data}` } },
              ]),
              timestamp: Date.now(),
            })
            continue // skip normal appendToolResult
          }
        }

        // Format the result for the next model call
        const resultStr =
          typeof result === 'string' ? result : JSON.stringify(result)
        appendToolResult(messages, call, resultStr, isAnthropic)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        yield {
          type: 'tool_result',
          name: call.toolName,
          result: `Error: ${msg}`,
        }
        appendToolResult(messages, call, `Error: ${msg}`, isAnthropic)
      }
    }

    // Loop continues — model gets tool results and responds again
  }

  yield { type: 'error', content: 'Max iterations reached' }
}

/**
 * Append a tool result to the message history in the correct format
 * for the current provider.
 */
function appendToolResult(
  messages: ChatMessage[],
  call: { toolName: string; toolUseId: string },
  resultStr: string,
  isAnthropic: boolean,
): void {
  if (isAnthropic) {
    // Anthropic format: tool results go as user messages with content blocks
    messages.push({
      role: 'user',
      content: JSON.stringify([
        {
          type: 'tool_result',
          tool_use_id: call.toolUseId,
          content: resultStr,
        },
      ]),
      timestamp: Date.now(),
    })
  } else {
    // OpenAI format: tool results use role:"tool" with tool_call_id
    messages.push({
      role: 'tool',
      content: resultStr,
      tool_call_id: call.toolUseId,
      timestamp: Date.now(),
    })
  }
}
