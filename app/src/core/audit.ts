/**
 * Audit trail — logs actions to SQLite DB and text file
 * Uses the existing memory DB module for SQLite storage
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Database } from 'bun:sqlite'

// --- Types ---

export type AuditResult = 'success' | 'denied' | 'error'

export interface AuditEntry {
  id?: number
  action: string
  details: string
  result: AuditResult
  timestamp: number
}

// --- Module state ---

let db: Database | null = null
let auditLogPath: string | null = null

/**
 * Get the default audit log file path
 */
function getDefaultLogPath(): string {
  return path.join(os.homedir(), '.local', 'share', 'linux-cowork', 'audit.log')
}

/**
 * Initialize the audit system
 * @param database — a bun:sqlite Database instance (from initDB or standalone)
 * @param logPath — optional custom log file path (for testing)
 */
export function initAudit(database: Database, logPath?: string): void {
  db = database

  // Create audit_log table if not exists (with result column)
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('success', 'denied', 'error')),
      timestamp INTEGER NOT NULL
    )
  `)

  auditLogPath = logPath ?? getDefaultLogPath()

  // Ensure log directory exists
  const dir = path.dirname(auditLogPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Close the audit system (nulls out refs, does NOT close the DB)
 */
export function closeAudit(): void {
  db = null
  auditLogPath = null
}

function getDB(): Database {
  if (!db) {
    throw new Error('Audit not initialized. Call initAudit() first.')
  }
  return db
}

function getLogPath(): string {
  if (!auditLogPath) {
    throw new Error('Audit not initialized. Call initAudit() first.')
  }
  return auditLogPath
}

// --- Core functions ---

/**
 * Log an action to both SQLite and the text file
 */
export function logAction(
  action: string,
  details: string,
  result: AuditResult,
): number {
  const d = getDB()
  const logFile = getLogPath()
  const timestamp = Date.now()

  // Write to DB
  const stmt = d.prepare(
    'INSERT INTO audit_log_v2 (action, details, result, timestamp) VALUES (?, ?, ?, ?)',
  )
  stmt.run(action, details, result, timestamp)
  const row = d.prepare('SELECT last_insert_rowid() as id').get() as { id: number }

  // Write to text file
  const iso = new Date(timestamp).toISOString()
  const line = `[${iso}] [${result}] ${action}: ${details}\n`
  fs.appendFileSync(logFile, line, 'utf-8')

  return row.id
}

/**
 * Get recent audit entries from the DB
 */
export function getRecentAudit(limit = 50): AuditEntry[] {
  const d = getDB()
  return d.prepare(
    'SELECT * FROM audit_log_v2 ORDER BY timestamp DESC, id DESC LIMIT ?',
  ).all(limit) as AuditEntry[]
}
