import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  readFile,
  writeFile,
  editFile,
  listDir,
  fileExists,
  getFileOperationLog,
} from '../src/core/file-access'

describe('File Access', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lc-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('readFile', () => {
    it('should read an existing file', async () => {
      const filePath = path.join(tmpDir, 'test.txt')
      await fs.writeFile(filePath, 'hello world', 'utf-8')

      const content = await readFile(filePath)
      expect(content).toBe('hello world')
    })

    it('should throw on non-existent file', async () => {
      await expect(readFile(path.join(tmpDir, 'nope.txt'))).rejects.toThrow()
    })
  })

  describe('writeFile', () => {
    it('should write a new file', async () => {
      const filePath = path.join(tmpDir, 'new.txt')
      await writeFile(filePath, 'content here')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('content here')
    })

    it('should create parent directories', async () => {
      const filePath = path.join(tmpDir, 'sub', 'dir', 'file.txt')
      await writeFile(filePath, 'nested')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('nested')
    })

    it('should overwrite existing file', async () => {
      const filePath = path.join(tmpDir, 'overwrite.txt')
      await writeFile(filePath, 'first')
      await writeFile(filePath, 'second')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('second')
    })
  })

  describe('editFile', () => {
    it('should replace a string in a file', async () => {
      const filePath = path.join(tmpDir, 'edit.txt')
      await fs.writeFile(filePath, 'hello world', 'utf-8')

      await editFile(filePath, 'world', 'vitest')

      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello vitest')
    })

    it('should throw if string not found', async () => {
      const filePath = path.join(tmpDir, 'edit2.txt')
      await fs.writeFile(filePath, 'hello world', 'utf-8')

      await expect(editFile(filePath, 'nothere', 'x')).rejects.toThrow('String not found')
    })
  })

  describe('listDir', () => {
    it('should list directory contents sorted', async () => {
      await fs.writeFile(path.join(tmpDir, 'b.txt'), '', 'utf-8')
      await fs.writeFile(path.join(tmpDir, 'a.txt'), '', 'utf-8')
      await fs.mkdir(path.join(tmpDir, 'c_dir'))

      const entries = await listDir(tmpDir)
      expect(entries).toEqual(['a.txt', 'b.txt', 'c_dir'])
    })
  })

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tmpDir, 'exists.txt')
      await fs.writeFile(filePath, '', 'utf-8')

      expect(await fileExists(filePath)).toBe(true)
    })

    it('should return false for non-existent file', async () => {
      expect(await fileExists(path.join(tmpDir, 'nope'))).toBe(false)
    })
  })

  describe('path validation', () => {
    it('should reject path traversal with /../', async () => {
      await expect(readFile('/tmp/test/../../../etc/passwd')).rejects.toThrow('Path traversal')
    })
  })

  describe('audit log', () => {
    it('should log file operations', async () => {
      const filePath = path.join(tmpDir, 'logged.txt')
      await writeFile(filePath, 'data')
      await readFile(filePath)

      const log = getFileOperationLog()
      const recent = log.slice(-2)
      expect(recent[0].type).toBe('write')
      expect(recent[1].type).toBe('read')
    })
  })
})
