/**
 * Hook Engine — event-driven hook system
 * Hooks execute serially so they can block or modify actions
 */

export type HookEvent =
  | 'session_start'
  | 'pre_tool_use'
  | 'post_tool_use'
  | 'user_message'
  | 'assistant_message'
  | 'error'
  | 'file_changed'

export interface HookContext {
  event: HookEvent
  data: Record<string, unknown>
  timestamp: number
}

export interface HookResult {
  allow: boolean
  reason?: string
  modified?: unknown
}

export interface Hook {
  id: string
  event: HookEvent
  handler: (context: HookContext) => Promise<HookResult>
}

export class HookEngine {
  private hooks: Map<string, Hook> = new Map()

  /**
   * Register a hook. Throws if id already exists.
   */
  registerHook(hook: Hook): void {
    if (this.hooks.has(hook.id)) {
      throw new Error(`Hook with id '${hook.id}' already registered`)
    }
    this.hooks.set(hook.id, hook)
  }

  /**
   * Remove a hook by id. Returns true if found, false otherwise.
   */
  removeHook(id: string): boolean {
    return this.hooks.delete(id)
  }

  /**
   * Emit an event — executes all matching hooks in registration order.
   * Stops early and returns the blocking result if any hook returns allow=false.
   */
  async emit(event: HookEvent, context: HookContext): Promise<HookResult> {
    const matching = Array.from(this.hooks.values()).filter(
      (h) => h.event === event,
    )

    for (const hook of matching) {
      const result = await hook.handler(context)
      if (!result.allow) {
        return result
      }
    }

    return { allow: true }
  }

  /**
   * Get all registered hook ids
   */
  listHooks(): string[] {
    return Array.from(this.hooks.keys())
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear()
  }
}

/** Singleton hook engine instance */
export const hookEngine = new HookEngine()
