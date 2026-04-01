/**
 * File History — undo/rollback for file operations
 * Stores snapshots before modifications so they can be restored
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

// --- Types ---

export interface FileSnapshot {
  path: string
  content: string | null // null = file did not exist
  timestamp: number
}

export interface FileHistory {
  snapshots: FileSnapshot[]
  maxSnapshots: number
}

// --- Manager ---

export class FileHistoryManager {
  private histories: Map<string, FileHistory> = new Map()
  private storageDir: string
  private maxSnapshots: number

  constructor(options?: { storageDir?: string; maxSnapshots?: number }) {
    this.storageDir =
      options?.storageDir ??
      path.join(os.homedir(), '.local', 'share', 'linux-cowork', 'file-history')
    this.maxSnapshots = options?.maxSnapshots ?? 10
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true })
  }

  /**
   * Resolve a file path to an absolute path used as history key
   */
  private resolveKey(filePath: string): string {
    return path.resolve(filePath)
  }

  /**
   * Get or create the history entry for a file
   */
  private getOrCreateHistory(key: string): FileHistory {
    let history = this.histories.get(key)
    if (!history) {
      history = { snapshots: [], maxSnapshots: this.maxSnapshots }
      this.histories.set(key, history)
    }
    return history
  }

  /**
   * Snapshot the current state of a file before modification.
   * If the file does not exist, stores content as null (undo = delete).
   */
  async snapshot(filePath: string): Promise<FileSnapshot> {
    await this.ensureStorageDir()
    const key = this.resolveKey(filePath)
    const history = this.getOrCreateHistory(key)

    let content: string | null = null
    try {
      content = await fs.readFile(key, 'utf-8')
    } catch {
      // File does not exist — content stays null
    }

    const snap: FileSnapshot = {
      path: key,
      content,
      timestamp: Date.now(),
    }

    history.snapshots.push(snap)

    // Evict oldest if over limit
    while (history.snapshots.length > history.maxSnapshots) {
      history.snapshots.shift()
    }

    // Persist to disk
    await this.persistHistory(key, history)

    return snap
  }

  /**
   * Undo — restore the last snapshot for a file.
   * If the snapshot content is null, deletes the file.
   * Returns the restored snapshot, or null if no history.
   */
  async undo(filePath: string): Promise<FileSnapshot | null> {
    const key = this.resolveKey(filePath)
    const history = this.histories.get(key)

    if (!history || history.snapshots.length === 0) {
      return null
    }

    const snap = history.snapshots.pop()!

    if (snap.content === null) {
      // File didn't exist before — remove it
      try {
        await fs.unlink(key)
      } catch {
        // Already gone, fine
      }
    } else {
      // Restore previous content
      await fs.mkdir(path.dirname(key), { recursive: true })
      await fs.writeFile(key, snap.content, 'utf-8')
    }

    // Persist updated history
    await this.persistHistory(key, history)

    return snap
  }

  /**
   * Get all snapshots for a file (oldest first)
   */
  getHistory(filePath: string): FileSnapshot[] {
    const key = this.resolveKey(filePath)
    const history = this.histories.get(key)
    if (!history) return []
    return [...history.snapshots]
  }

  /**
   * Clear history for a specific file, or all files if no path given
   */
  async clearHistory(filePath?: string): Promise<void> {
    if (filePath) {
      const key = this.resolveKey(filePath)
      this.histories.delete(key)
      // Remove persisted file
      try {
        const persistPath = this.getPersistPath(key)
        await fs.unlink(persistPath)
      } catch {
        // No persisted file, fine
      }
    } else {
      this.histories.clear()
      // Remove all persisted files
      try {
        const entries = await fs.readdir(this.storageDir)
        for (const entry of entries) {
          await fs.unlink(path.join(this.storageDir, entry))
        }
      } catch {
        // Directory might not exist
      }
    }
  }

  // --- Persistence helpers ---

  /**
   * Get the path where history for a given file key is persisted
   */
  private getPersistPath(key: string): string {
    // Encode the file path as a safe filename
    const encoded = Buffer.from(key).toString('base64url')
    return path.join(this.storageDir, `${encoded}.json`)
  }

  /**
   * Write history to disk
   */
  private async persistHistory(key: string, history: FileHistory): Promise<void> {
    const persistPath = this.getPersistPath(key)
    await fs.writeFile(persistPath, JSON.stringify(history), 'utf-8')
  }

  /**
   * Load history from disk for a specific file
   */
  async loadHistory(filePath: string): Promise<FileHistory | null> {
    const key = this.resolveKey(filePath)
    const persistPath = this.getPersistPath(key)

    try {
      const raw = await fs.readFile(persistPath, 'utf-8')
      const history = JSON.parse(raw) as FileHistory
      this.histories.set(key, history)
      return history
    } catch {
      return null
    }
  }
}
