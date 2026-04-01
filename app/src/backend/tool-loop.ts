/**
 * Tool-use loop — streams model output, executes tools, reboucles until done
 */

import { modelRouter, type ModelRouter } from '../core/models/router'
import type {
  ModelConfig,
  ChatMessage,
  ContentBlock,
} from '../core/models/types'
import type { ToolRegistry } from './tool-registry'

export interface SSEEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  name?: string
  input?: Record<string, unknown>
  result?: string | ContentBlock[]
}

export interface ToolLoopOptions {
  maxIterations?: number
  timeoutMs?: number
  systemPrompt?: string
}

const DEFAULT_SYSTEM_PROMPT =
  'You can control a Linux desktop. Use the screenshot tool to see the screen, then use click, type_text, key_press to interact. Always take a screenshot after each action to verify the result.'

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
      yield { type: 'done' }
      return
    }

    // Add assistant message to context
    messages.push({
      role: 'assistant',
      content: assistantText,
      timestamp: Date.now(),
    })

    // Execute each tool and collect results
    for (const call of pendingToolCalls) {
      yield { type: 'tool_call', name: call.toolName, input: call.toolInput }

      const registeredTool = toolRegistry.get(call.toolName)
      if (!registeredTool) {
        const errorResult = `Error: unknown tool "${call.toolName}"`
        yield { type: 'tool_result', name: call.toolName, result: errorResult }
        messages.push({
          role: 'user',
          content: `[tool_result for ${call.toolName}]: ${errorResult}`,
          timestamp: Date.now(),
        })
        continue
      }

      try {
        const result = await registeredTool.executor(call.toolInput)
        yield { type: 'tool_result', name: call.toolName, result }

        // Add tool result to messages context for next iteration
        const resultStr =
          typeof result === 'string'
            ? result
            : JSON.stringify(result)
        messages.push({
          role: 'user',
          content: `[tool_result for ${call.toolName}]: ${resultStr}`,
          timestamp: Date.now(),
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        yield {
          type: 'tool_result',
          name: call.toolName,
          result: `Error: ${msg}`,
        }
        messages.push({
          role: 'user',
          content: `[tool_result for ${call.toolName}]: Error: ${msg}`,
          timestamp: Date.now(),
        })
      }
    }

    // Loop continues — model gets tool results and responds again
  }

  yield { type: 'error', content: 'Max iterations reached' }
}
