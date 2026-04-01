import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from 'bun:sqlite'
import { TaskManager } from '../src/core/task/manager'

describe('TaskManager', () => {
  let db: Database
  let manager: TaskManager

  beforeEach(() => {
    db = new Database(':memory:')
    manager = new TaskManager(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('createTask', () => {
    it('should create a task with pending status', () => {
      const task = manager.createTask('Test task')
      expect(task.id).toBeGreaterThan(0)
      expect(task.title).toBe('Test task')
      expect(task.status).toBe('pending')
      expect(task.output).toBeNull()
    })

    it('should assign unique ids', () => {
      const t1 = manager.createTask('First')
      const t2 = manager.createTask('Second')
      expect(t1.id).not.toBe(t2.id)
    })
  })

  describe('getTask', () => {
    it('should return a task by id', () => {
      const created = manager.createTask('Lookup')
      const found = manager.getTask(created.id)
      expect(found).not.toBeNull()
      expect(found!.title).toBe('Lookup')
    })

    it('should return null for non-existent id', () => {
      expect(manager.getTask(999)).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update title', () => {
      const task = manager.createTask('Old title')
      const updated = manager.updateTask(task.id, { title: 'New title' })
      expect(updated!.title).toBe('New title')
    })

    it('should update status', () => {
      const task = manager.createTask('Task')
      const updated = manager.updateTask(task.id, { status: 'running' })
      expect(updated!.status).toBe('running')
    })

    it('should update output', () => {
      const task = manager.createTask('Task')
      const updated = manager.updateTask(task.id, {
        status: 'completed',
        output: 'Done!',
      })
      expect(updated!.output).toBe('Done!')
      expect(updated!.status).toBe('completed')
    })

    it('should return null for non-existent task', () => {
      expect(manager.updateTask(999, { title: 'x' })).toBeNull()
    })
  })

  describe('listTasks', () => {
    it('should list all tasks', () => {
      manager.createTask('A')
      manager.createTask('B')
      manager.createTask('C')

      const tasks = manager.listTasks()
      expect(tasks).toHaveLength(3)
    })

    it('should filter by status', () => {
      const t1 = manager.createTask('Pending one')
      const t2 = manager.createTask('Running one')
      manager.updateTask(t2.id, { status: 'running' })

      const pending = manager.listTasks({ status: 'pending' })
      expect(pending).toHaveLength(1)
      expect(pending[0].title).toBe('Pending one')

      const running = manager.listTasks({ status: 'running' })
      expect(running).toHaveLength(1)
      expect(running[0].title).toBe('Running one')
    })

    it('should return empty array when no tasks', () => {
      expect(manager.listTasks()).toEqual([])
    })
  })

  describe('runTask', () => {
    it('should run a task and set completed with output', async () => {
      const task = manager.createTask('Async job')

      const result = await manager.runTask(task.id, async () => {
        return 'success output'
      })

      expect(result!.status).toBe('completed')
      expect(result!.output).toBe('success output')
    })

    it('should set failed status on error', async () => {
      const task = manager.createTask('Failing job')

      const result = await manager.runTask(task.id, async () => {
        throw new Error('boom')
      })

      expect(result!.status).toBe('failed')
      expect(result!.output).toBe('boom')
    })

    it('should set running status during execution', async () => {
      const task = manager.createTask('Check running')
      let statusDuringRun: string | undefined

      await manager.runTask(task.id, async () => {
        statusDuringRun = manager.getTask(task.id)!.status
        return 'done'
      })

      expect(statusDuringRun).toBe('running')
    })

    it('should return null for non-existent task', async () => {
      const result = await manager.runTask(999, async () => 'x')
      expect(result).toBeNull()
    })
  })
})
