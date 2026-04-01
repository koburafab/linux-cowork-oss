/**
 * Task Manager — tracks async tasks with SQLite persistence
 */

import { Database } from 'bun:sqlite'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Task {
  id: number
  title: string
  status: TaskStatus
  created_at: string
  updated_at: string
  output?: string
}

export type TaskUpdate = Partial<Pick<Task, 'title' | 'status' | 'output'>>

/**
 * Ensures the tasks table exists in the given database
 */
export function initTasksTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
      output TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

export class TaskManager {
  private db: Database

  constructor(db: Database) {
    this.db = db
    initTasksTable(this.db)
  }

  /**
   * Create a new task with the given title
   */
  createTask(title: string): Task {
    this.db
      .prepare('INSERT INTO tasks (title, status) VALUES (?, ?)')
      .run(title, 'pending')

    const row = this.db
      .prepare('SELECT last_insert_rowid() as id')
      .get() as { id: number }

    return this.getTask(row.id)!
  }

  /**
   * Update a task by id
   */
  updateTask(id: number, updates: TaskUpdate): Task | null {
    const existing = this.getTask(id)
    if (!existing) return null

    const sets: string[] = ["updated_at = datetime('now')"]
    const values: unknown[] = []

    if (updates.title !== undefined) {
      sets.push('title = ?')
      values.push(updates.title)
    }
    if (updates.status !== undefined) {
      sets.push('status = ?')
      values.push(updates.status)
    }
    if (updates.output !== undefined) {
      sets.push('output = ?')
      values.push(updates.output)
    }

    values.push(id)
    this.db
      .prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`)
      .run(...(values as [string, ...string[]]))

    return this.getTask(id)
  }

  /**
   * Get a task by id
   */
  getTask(id: number): Task | null {
    const row = this.db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(id) as Task | null
    return row || null
  }

  /**
   * List tasks, optionally filtered by status
   */
  listTasks(filter?: { status?: TaskStatus }): Task[] {
    if (filter?.status) {
      return this.db
        .prepare(
          'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC',
        )
        .all(filter.status) as Task[]
    }
    return this.db
      .prepare('SELECT * FROM tasks ORDER BY created_at DESC')
      .all() as Task[]
  }

  /**
   * Run a task: sets status to running, executes fn, sets completed/failed
   */
  async runTask(
    id: number,
    fn: () => Promise<string>,
  ): Promise<Task | null> {
    const task = this.getTask(id)
    if (!task) return null

    this.updateTask(id, { status: 'running' })

    try {
      const output = await fn()
      return this.updateTask(id, { status: 'completed', output })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return this.updateTask(id, { status: 'failed', output: message })
    }
  }
}
