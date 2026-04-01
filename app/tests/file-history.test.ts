import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { FileHistoryManager } from '../src/core/file-history'

describe('FileHistoryManager', () => {
  let tmpDir: string
  let storageDir: string
  let manager: FileHistoryManager

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-test-'))
    storageDir = path.join(tmpDir, 'history')
    manager = new FileHistoryManager({ storageDir, maxSnapshots: 10 })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('snapshot + undo cycle', () => {
    it('should snapshot a file and undo restores it', async () => {
      const filePath = path.join(tmpDir, 'test.txt')
      await fsp.writeFile(filePath, 'original', 'utf-8')

      // Snapshot the original state
      await manager.snapshot(filePath)

      // Modify the file
      await fsp.writeFile(filePath, 'modified', 'utf-8')
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('modified')

      // Undo — should restore to original
      const snap = await manager.undo(filePath)
      expect(snap).not.toBeNull()
      expect(snap!.content).toBe('original')
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('original')
    })
  })

  describe('multiple snapshots', () => {
    it('should undo restores the last snapshot (most recent)', async () => {
      const filePath = path.join(tmpDir, 'multi.txt')
      await fsp.writeFile(filePath, 'v1', 'utf-8')

      await manager.snapshot(filePath) // saves v1
      await fsp.writeFile(filePath, 'v2', 'utf-8')

      await manager.snapshot(filePath) // saves v2
      await fsp.writeFile(filePath, 'v3', 'utf-8')

      // First undo: back to v2
      const snap1 = await manager.undo(filePath)
      expect(snap1!.content).toBe('v2')
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('v2')

      // Second undo: back to v1
      const snap2 = await manager.undo(filePath)
      expect(snap2!.content).toBe('v1')
      expect(await fsp.readFile(filePath, 'utf-8')).toBe('v1')

      // Third undo: no more snapshots
      const snap3 = await manager.undo(filePath)
      expect(snap3).toBeNull()
    })
  })

  describe('snapshot of non-existent file', () => {
    it('should store null content and undo deletes the file', async () => {
      const filePath = path.join(tmpDir, 'new-file.txt')

      // Snapshot before file exists
      const snap = await manager.snapshot(filePath)
      expect(snap.content).toBeNull()

      // Create the file
      await fsp.writeFile(filePath, 'created', 'utf-8')
      expect(fs.existsSync(filePath)).toBe(true)

      // Undo — should delete the file
      const restored = await manager.undo(filePath)
      expect(restored!.content).toBeNull()
      expect(fs.existsSync(filePath)).toBe(false)
    })
  })

  describe('max snapshots eviction', () => {
    it('should evict oldest snapshots when over limit', async () => {
      const mgr = new FileHistoryManager({ storageDir, maxSnapshots: 3 })
      const filePath = path.join(tmpDir, 'evict.txt')

      // Create 5 snapshots
      for (let i = 1; i <= 5; i++) {
        await fsp.writeFile(filePath, `v${i}`, 'utf-8')
        await mgr.snapshot(filePath)
      }

      // Only 3 should remain
      const history = mgr.getHistory(filePath)
      expect(history).toHaveLength(3)

      // Oldest remaining should be v3 (v1, v2 evicted)
      expect(history[0].content).toBe('v3')
      expect(history[1].content).toBe('v4')
      expect(history[2].content).toBe('v5')
    })
  })

  describe('getHistory', () => {
    it('should return empty array for unknown file', () => {
      const history = manager.getHistory('/nonexistent/file.txt')
      expect(history).toEqual([])
    })

    it('should return snapshots in order (oldest first)', async () => {
      const filePath = path.join(tmpDir, 'hist.txt')
      await fsp.writeFile(filePath, 'a', 'utf-8')
      await manager.snapshot(filePath)
      await fsp.writeFile(filePath, 'b', 'utf-8')
      await manager.snapshot(filePath)

      const history = manager.getHistory(filePath)
      expect(history).toHaveLength(2)
      expect(history[0].content).toBe('a')
      expect(history[1].content).toBe('b')
    })
  })

  describe('clearHistory', () => {
    it('should clear history for a specific file', async () => {
      const filePath = path.join(tmpDir, 'clear.txt')
      await fsp.writeFile(filePath, 'data', 'utf-8')
      await manager.snapshot(filePath)

      expect(manager.getHistory(filePath)).toHaveLength(1)

      await manager.clearHistory(filePath)
      expect(manager.getHistory(filePath)).toHaveLength(0)

      // Undo should return null after clear
      const snap = await manager.undo(filePath)
      expect(snap).toBeNull()
    })

    it('should clear all histories when no path given', async () => {
      const file1 = path.join(tmpDir, 'a.txt')
      const file2 = path.join(tmpDir, 'b.txt')
      await fsp.writeFile(file1, 'a', 'utf-8')
      await fsp.writeFile(file2, 'b', 'utf-8')
      await manager.snapshot(file1)
      await manager.snapshot(file2)

      expect(manager.getHistory(file1)).toHaveLength(1)
      expect(manager.getHistory(file2)).toHaveLength(1)

      await manager.clearHistory()
      expect(manager.getHistory(file1)).toHaveLength(0)
      expect(manager.getHistory(file2)).toHaveLength(0)
    })
  })

  describe('snapshot metadata', () => {
    it('should include path and timestamp', async () => {
      const filePath = path.join(tmpDir, 'meta.txt')
      await fsp.writeFile(filePath, 'content', 'utf-8')

      const before = Date.now()
      const snap = await manager.snapshot(filePath)
      const after = Date.now()

      expect(snap.path).toBe(path.resolve(filePath))
      expect(snap.timestamp).toBeGreaterThanOrEqual(before)
      expect(snap.timestamp).toBeLessThanOrEqual(after)
    })
  })
})
