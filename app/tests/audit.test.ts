import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { Database } from 'bun:sqlite'
import { initAudit, closeAudit, logAction, getRecentAudit } from '../src/core/audit'

describe('Audit', () => {
  let db: Database
  let tmpDir: string
  let logPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'))
    logPath = path.join(tmpDir, 'audit.log')
    db = new Database(':memory:')
    initAudit(db, logPath)
  })

  afterEach(() => {
    closeAudit()
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('initAudit', () => {
    it('should initialize without error', () => {
      // Already initialized in beforeEach
      expect(true).toBe(true)
    })

    it('should throw if not initialized', () => {
      closeAudit()
      expect(() => logAction('test', 'details', 'success')).toThrow('Audit not initialized')
    })
  })

  describe('logAction', () => {
    it('should log to DB and return an id', () => {
      const id = logAction('file:read', '/etc/hostname', 'success')
      expect(id).toBeGreaterThan(0)
    })

    it('should store correct data in DB', () => {
      logAction('file:write', '/tmp/test.txt', 'success')

      const entries = getRecentAudit()
      expect(entries).toHaveLength(1)
      expect(entries[0].action).toBe('file:write')
      expect(entries[0].details).toBe('/tmp/test.txt')
      expect(entries[0].result).toBe('success')
      expect(entries[0].timestamp).toBeGreaterThan(0)
    })

    it('should log denied actions', () => {
      logAction('shell:exec', 'rm -rf /', 'denied')

      const entries = getRecentAudit()
      expect(entries[0].result).toBe('denied')
    })

    it('should log error actions', () => {
      logAction('file:read', '/nonexistent', 'error')

      const entries = getRecentAudit()
      expect(entries[0].result).toBe('error')
    })
  })

  describe('log to file', () => {
    it('should create the log file', () => {
      logAction('test', 'details', 'success')
      expect(fs.existsSync(logPath)).toBe(true)
    })

    it('should write formatted lines to the log file', () => {
      logAction('file:read', '/etc/hostname', 'success')
      logAction('shell:exec', 'rm -rf /', 'denied')

      const content = fs.readFileSync(logPath, 'utf-8')
      const lines = content.trim().split('\n')
      expect(lines).toHaveLength(2)

      // Check format: [ISO timestamp] [result] action: details
      expect(lines[0]).toMatch(/^\[.+\] \[success\] file:read: \/etc\/hostname$/)
      expect(lines[1]).toMatch(/^\[.+\] \[denied\] shell:exec: rm -rf \/$/)
    })

    it('should write valid ISO timestamps', () => {
      logAction('test', 'data', 'success')

      const content = fs.readFileSync(logPath, 'utf-8')
      const match = content.match(/^\[(.+?)\]/)
      expect(match).not.toBeNull()

      const date = new Date(match![1])
      expect(date.getTime()).not.toBeNaN()
    })
  })

  describe('getRecentAudit', () => {
    it('should return entries in reverse chronological order', () => {
      // Entries have same Date.now() but different IDs — ORDER BY timestamp DESC, id DESC
      logAction('first', 'a', 'success')
      logAction('second', 'b', 'success')

      const entries = getRecentAudit()
      // Most recent (highest id) should come first
      expect(entries).toHaveLength(2)
      expect(entries[0].id).toBeGreaterThan(entries[1].id!)
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        logAction(`action-${i}`, 'x', 'success')
      }

      expect(getRecentAudit(3)).toHaveLength(3)
      expect(getRecentAudit(10)).toHaveLength(10)
      expect(getRecentAudit()).toHaveLength(10) // default limit=50
    })

    it('should return empty array when no entries', () => {
      expect(getRecentAudit()).toHaveLength(0)
    })
  })
})
