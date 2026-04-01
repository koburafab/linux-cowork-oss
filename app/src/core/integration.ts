/**
 * Integration — CoworkApp connects all subsystems into a single entry point
 */

import { Database } from 'bun:sqlite'
import * as path from 'node:path'
import * as os from 'node:os'

import { initDB, closeDB } from './memory/db'
import { initAudit, closeAudit, logAction, getRecentAudit } from './audit'
import { loadSettings, type Settings } from './settings'
import { HookEngine } from './hooks/engine'
import { checkPermission, type PermissionResult } from './permissions'
import { FileHistoryManager } from './file-history'
import { QueryEngine } from './engine'
import { AgentOrchestrator, type AgentConfig, type Agent } from './agent/orchestrator'
import { useChatStore } from '../stores/chatStore'
import * as fileAccess from './file-access'

export interface CoworkStatus {
  initialized: boolean
  activeModel: string
  agents: string[]
  auditEntries: number
  settings: Settings
}

export class CoworkApp {
  private db: Database | null = null
  private hookEngine: HookEngine = new HookEngine()
  private fileHistory: FileHistoryManager = new FileHistoryManager()
  private queryEngine: QueryEngine | null = null
  private orchestrator: AgentOrchestrator = new AgentOrchestrator()
  private settings: Settings | null = null
  private _initialized = false

  /**
   * Initialize all subsystems: DB, audit, settings, hooks, permissions, file history
   */
  async init(options?: {
    dbPath?: string
    auditLogPath?: string
    settingsPath?: string
    fileHistoryDir?: string
  }): Promise<void> {
    if (this._initialized) return

    // 1. Database
    this.db = initDB(options?.dbPath ?? ':memory:')

    // 2. Audit
    const auditLogDir = options?.auditLogPath
      ?? path.join(os.homedir(), '.local', 'share', 'linux-cowork', 'audit.log')
    initAudit(this.db, auditLogDir)

    // 3. Settings
    this.settings = loadSettings(options?.settingsPath)

    // 4. Hook engine (fresh instance)
    this.hookEngine = new HookEngine()

    // 5. File history
    this.fileHistory = new FileHistoryManager({
      storageDir: options?.fileHistoryDir,
    })

    // 6. Query engine
    this.queryEngine = new QueryEngine()

    this._initialized = true
  }

  /**
   * Send a chat message and return the response
   */
  async chat(message: string): Promise<string> {
    this.ensureInitialized()
    logAction('chat:user', message.slice(0, 200), 'success')
    return this.queryEngine!.sendMessage(message)
  }

  /**
   * Execute a computer-use tool action with permission check
   */
  async executeComputerUse(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<PermissionResult & { executed: boolean }> {
    this.ensureInitialized()

    const operation = `computer-use:${tool}`
    const permission = checkPermission(operation)

    logAction(
      operation,
      JSON.stringify(args).slice(0, 200),
      permission.allowed ? 'success' : 'denied',
    )

    return { ...permission, executed: permission.allowed }
  }

  /**
   * Read a file with audit trail
   */
  async readFile(filePath: string): Promise<string> {
    this.ensureInitialized()

    const content = await fileAccess.readFile(filePath)
    logAction('file:read', filePath, 'success')
    return content
  }

  /**
   * Write a file with undo snapshot + audit
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    this.ensureInitialized()

    // Snapshot before writing (for undo)
    await this.fileHistory.snapshot(filePath)

    await fileAccess.writeFile(filePath, content)
    logAction('file:write', filePath, 'success')
  }

  /**
   * Undo the last write to a file
   */
  async undoFile(filePath: string) {
    this.ensureInitialized()
    const snap = await this.fileHistory.undo(filePath)
    if (snap) {
      logAction('file:undo', filePath, 'success')
    }
    return snap
  }

  /**
   * Spawn a sub-agent
   */
  spawnAgent(config: AgentConfig): Agent {
    this.ensureInitialized()
    const agent = this.orchestrator.spawnAgent(config)
    logAction('agent:spawn', `${config.name} (${agent.id})`, 'success')
    return agent
  }

  /**
   * Get full application status
   */
  getStatus(): CoworkStatus {
    const store = useChatStore.getState()
    const agents = this.orchestrator.listAgents()
    const audit = this._initialized ? getRecentAudit(1000) : []

    return {
      initialized: this._initialized,
      activeModel: store.activeModel.name,
      agents: agents.map((a) => a.id),
      auditEntries: audit.length,
      settings: this.settings ?? loadSettings(),
    }
  }

  /**
   * Get the hook engine (for registering hooks)
   */
  getHookEngine(): HookEngine {
    return this.hookEngine
  }

  /**
   * Get the file history manager
   */
  getFileHistory(): FileHistoryManager {
    return this.fileHistory
  }

  /**
   * Get the orchestrator
   */
  getOrchestrator(): AgentOrchestrator {
    return this.orchestrator
  }

  /**
   * Clean shutdown — close DB, audit, clear hooks
   */
  async shutdown(): Promise<void> {
    if (!this._initialized) return

    this.hookEngine.clear()
    this.orchestrator.clear()
    closeAudit()
    closeDB()

    this.db = null
    this.queryEngine = null
    this.settings = null
    this._initialized = false
  }

  private ensureInitialized(): void {
    if (!this._initialized) {
      throw new Error('CoworkApp not initialized. Call init() first.')
    }
  }
}

/** Singleton instance */
export const coworkApp = new CoworkApp()
