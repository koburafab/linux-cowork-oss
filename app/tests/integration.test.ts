import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { CoworkApp } from '../src/core/integration'

describe('CoworkApp Integration', () => {
  let app: CoworkApp
  let tmpDir: string
  let auditLogPath: string

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-int-'))
    auditLogPath = path.join(tmpDir, 'audit.log')
    app = new CoworkApp()
    await app.init({
      dbPath: ':memory:',
      auditLogPath,
      fileHistoryDir: path.join(tmpDir, 'history'),
    })
  })

  afterEach(async () => {
    await app.shutdown()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('init + shutdown cycle', () => {
    it('should initialize and report as initialized', () => {
      const status = app.getStatus()
      expect(status.initialized).toBe(true)
    })

    it('should shutdown cleanly', async () => {
      await app.shutdown()
      const status = app.getStatus()
      expect(status.initialized).toBe(false)
    })

    it('should not double-init', async () => {
      // Second init should be a no-op (no error)
      await app.init({ dbPath: ':memory:', auditLogPath })
      expect(app.getStatus().initialized).toBe(true)
    })

    it('should throw if used before init', async () => {
      const fresh = new CoworkApp()
      await expect(fresh.readFile('/tmp/test')).rejects.toThrow('not initialized')
    })
  })

  describe('getStatus', () => {
    it('should return active model name', () => {
      const status = app.getStatus()
      expect(status.activeModel).toBeTruthy()
      expect(typeof status.activeModel).toBe('string')
    })

    it('should return empty agents list initially', () => {
      const status = app.getStatus()
      expect(status.agents).toEqual([])
    })

    it('should return settings', () => {
      const status = app.getStatus()
      expect(status.settings).toBeDefined()
      expect(status.settings.activeModel).toBeTruthy()
    })
  })

  describe('readFile with audit trail', () => {
    it('should read a file and log to audit', async () => {
      const filePath = path.join(tmpDir, 'read-test.txt')
      await fsp.writeFile(filePath, 'hello world', 'utf-8')

      const content = await app.readFile(filePath)
      expect(content).toBe('hello world')

      // Audit log file should contain the read entry
      const logContent = fs.readFileSync(auditLogPath, 'utf-8')
      expect(logContent).toContain('file:read')
      expect(logContent).toContain(filePath)
    })
  })

  describe('writeFile with undo snapshot', () => {
    it('should write a file and snapshot for undo', async () => {
      const filePath = path.join(tmpDir, 'write-test.txt')
      await fsp.writeFile(filePath, 'before', 'utf-8')

      await app.writeFile(filePath, 'after')
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('after')

      // Undo should restore
      const snap = await app.undoFile(filePath)
      expect(snap).not.toBeNull()
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('before')
    })

    it('should log write in audit', async () => {
      const filePath = path.join(tmpDir, 'audit-write.txt')
      await app.writeFile(filePath, 'data')

      const logContent = fs.readFileSync(auditLogPath, 'utf-8')
      expect(logContent).toContain('file:write')
    })
  })

  describe('executeComputerUse with permission check', () => {
    it('should deny dangerous operations', async () => {
      const result = await app.executeComputerUse('rm -rf', { path: '/' })
      expect(result.allowed).toBe(false)
      expect(result.executed).toBe(false)
    })

    it('should log the action to audit', async () => {
      await app.executeComputerUse('screenshot', { x: 0, y: 0 })

      const logContent = fs.readFileSync(auditLogPath, 'utf-8')
      expect(logContent).toContain('computer-use:screenshot')
    })
  })

  describe('spawnAgent', () => {
    it('should spawn an agent and track it in status', () => {
      const agent = app.spawnAgent({
        name: 'test-agent',
        model: {
          id: 'test',
          name: 'Test Model',
          provider: 'ollama',
          model: 'test',
        },
        systemPrompt: 'You are a test agent',
      })

      expect(agent.id).toBeTruthy()

      const status = app.getStatus()
      expect(status.agents).toContain(agent.id)
    })
  })

  describe('hookEngine access', () => {
    it('should expose the hook engine for registration', () => {
      const hookEngine = app.getHookEngine()
      expect(hookEngine).toBeDefined()
      expect(typeof hookEngine.registerHook).toBe('function')
    })
  })

  describe('fileHistory access', () => {
    it('should expose the file history manager', () => {
      const fh = app.getFileHistory()
      expect(fh).toBeDefined()
      expect(typeof fh.snapshot).toBe('function')
    })
  })
})
