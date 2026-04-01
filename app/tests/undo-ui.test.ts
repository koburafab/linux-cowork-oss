/**
 * Tests for undo/file-history functionality
 * Tests FileHistoryManager directly — no vi.mock needed
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { FileHistoryManager } from '../src/core/file-history'

describe('Undo — FileHistoryManager', () => {
  let manager: FileHistoryManager
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'undo-test-'))
    manager = new FileHistoryManager(path.join(tmpDir, 'history'))
  })

  afterEach(() => {
    manager.clearHistory()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should snapshot and undo a file', async () => {
    const filePath = path.join(tmpDir, 'test.txt')
    await fsp.writeFile(filePath, 'original', 'utf-8')

    await manager.snapshot(filePath)
    await fsp.writeFile(filePath, 'modified', 'utf-8')

    const result = await manager.undo(filePath)
    expect(result).toBeDefined()
    expect(await fsp.readFile(filePath, 'utf-8')).toBe('original')
  })

  it('should return null when no history', async () => {
    const result = await manager.undo('/nonexistent/file.txt')
    expect(result).toBeNull()
  })

  it('should return empty history for unknown file', () => {
    const history = manager.getHistory('/unknown/file.txt')
    expect(history).toEqual([])
  })

  it('should track multiple snapshots', async () => {
    const filePath = path.join(tmpDir, 'multi.txt')
    await fsp.writeFile(filePath, 'v1', 'utf-8')
    await manager.snapshot(filePath)
    await fsp.writeFile(filePath, 'v2', 'utf-8')
    await manager.snapshot(filePath)

    const history = manager.getHistory(filePath)
    expect(history).toHaveLength(2)
  })

  it('should clear history', async () => {
    const filePath = path.join(tmpDir, 'clear.txt')
    await fsp.writeFile(filePath, 'data', 'utf-8')
    await manager.snapshot(filePath)

    manager.clearHistory(filePath)
    expect(manager.getHistory(filePath)).toEqual([])
  })
})
