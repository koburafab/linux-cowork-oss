/**
 * Memory DB — SQLite-backed persistent storage
 * Stores conversations, messages, memories, and audit log
 * Uses bun:sqlite for Bun compatibility, falls back to better-sqlite3 for Node
 */

import { Database } from 'bun:sqlite'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'

export interface Memory {
  id?: number
  type: 'user' | 'project' | 'feedback' | 'reference'
  name: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface Conversation {
  id?: number
  title: string
  model: string
  created_at?: string
}

export interface Message {
  id?: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string
}

export interface AuditEntry {
  id?: number
  action: string
  details: string
  model?: string
  timestamp: number
}

let db: Database | null = null

/**
 * Get the database path
 */
function getDBPath(): string {
  const dataDir = path.join(os.homedir(), '.local', 'share', 'linux-cowork')
  return path.join(dataDir, 'memory.db')
}

/**
 * Initialize the database with all tables
 * Optionally accepts a path (use ':memory:' for tests)
 */
export function initDB(dbPath?: string): Database {
  const targetPath = dbPath || getDBPath()

  // Ensure directory exists for file-based DBs
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  db = new Database(targetPath)
  db.run('PRAGMA journal_mode = WAL')

  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('user', 'project', 'feedback', 'reference')),
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      model TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      model TEXT,
      timestamp INTEGER NOT NULL
    )
  `)

  return db
}

/**
 * Get the current DB instance (must call initDB first)
 */
function getDB(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.')
  }
  return db
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (db) {
    db.close()
    db = null
  }
}

// --- Memories ---

export function saveMemory(memory: Memory): number {
  const d = getDB()
  const stmt = d.prepare(
    'INSERT INTO memories (type, name, content) VALUES (?, ?, ?)',
  )
  stmt.run(memory.type, memory.name, memory.content)
  const row = d.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
  return row.id
}

export function getMemories(type?: Memory['type']): Memory[] {
  const d = getDB()
  if (type) {
    return d.prepare('SELECT * FROM memories WHERE type = ? ORDER BY created_at DESC').all(type) as Memory[]
  }
  return d.prepare('SELECT * FROM memories ORDER BY created_at DESC').all() as Memory[]
}

// --- Conversations ---

export function saveConversation(conv: Conversation): number {
  const d = getDB()
  const stmt = d.prepare(
    'INSERT INTO conversations (title, model) VALUES (?, ?)',
  )
  stmt.run(conv.title, conv.model)
  const row = d.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
  return row.id
}

export function getConversations(): Conversation[] {
  const d = getDB()
  return d.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all() as Conversation[]
}

// --- Messages ---

export function saveMessage(msg: Message): number {
  const d = getDB()
  const stmt = d.prepare(
    'INSERT INTO messages (conversation_id, role, content, timestamp, model) VALUES (?, ?, ?, ?, ?)',
  )
  stmt.run(msg.conversation_id, msg.role, msg.content, msg.timestamp, msg.model || null)
  const row = d.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
  return row.id
}

export function getMessages(conversationId: number): Message[] {
  const d = getDB()
  return d.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(conversationId) as Message[]
}

// --- Audit Log ---

export function logAudit(entry: AuditEntry): number {
  const d = getDB()
  const stmt = d.prepare(
    'INSERT INTO audit_log (action, details, model, timestamp) VALUES (?, ?, ?, ?)',
  )
  stmt.run(entry.action, entry.details, entry.model || null, entry.timestamp)
  const row = d.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
  return row.id
}

export function getAuditLog(limit = 100): AuditEntry[] {
  const d = getDB()
  return d.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?').all(limit) as AuditEntry[]
}
