import { describe, it, expect, afterEach } from 'vitest'
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { acquireLock, releaseLock, checkLock, isLockHeld } from '../src/core/computer-use/lock'

const TEST_DIR = '/tmp/cowork-lock-tests'
let lockFiles: string[] = []

function testLockPath(): string {
  const p = join(TEST_DIR, `lock-${Date.now()}-${Math.random().toString(36).slice(2)}.lock`)
  lockFiles.push(p)
  return p
}

afterEach(() => {
  // Clean up test lock files
  for (const f of lockFiles) {
    try {
      if (existsSync(f)) unlinkSync(f)
    } catch {
      // ignore
    }
  }
  lockFiles = []
})

describe('Lock System', () => {
  it('should acquire and release a lock', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    const data = acquireLock('session-a', lockPath)
    expect(data.sessionId).toBe('session-a')
    expect(data.pid).toBe(process.pid)
    expect(existsSync(lockPath)).toBe(true)

    releaseLock(lockPath)
    expect(existsSync(lockPath)).toBe(false)
  })

  it('should block double acquire from same process', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    acquireLock('session-b', lockPath)

    // Second acquire should throw (same PID is still alive)
    expect(() => acquireLock('session-c', lockPath)).toThrow(
      /lock held by session/i,
    )

    releaseLock(lockPath)
  })

  it('should recover stale lock with fake dead PID', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    // Write lock with a PID that doesn't exist
    writeFileSync(
      lockPath,
      JSON.stringify({
        sessionId: 'ghost',
        pid: 2147483647, // max PID — almost certainly dead
        acquiredAt: new Date().toISOString(),
      }),
    )

    // Should recover the stale lock
    const data = acquireLock('new-session', lockPath)
    expect(data.sessionId).toBe('new-session')
    expect(data.pid).toBe(process.pid)

    releaseLock(lockPath)
  })

  it('checkLock returns null when no lock', () => {
    const lockPath = testLockPath()
    expect(checkLock(lockPath)).toBeNull()
  })

  it('checkLock returns data when locked', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    acquireLock('session-check', lockPath)
    const data = checkLock(lockPath)
    expect(data).not.toBeNull()
    expect(data?.sessionId).toBe('session-check')

    releaseLock(lockPath)
  })

  it('isLockHeld returns false when no lock', () => {
    const lockPath = testLockPath()
    expect(isLockHeld(lockPath)).toBe(false)
  })

  it('isLockHeld returns true when locked by live process', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    acquireLock('session-held', lockPath)
    expect(isLockHeld(lockPath)).toBe(true)

    releaseLock(lockPath)
    expect(isLockHeld(lockPath)).toBe(false)
  })

  it('isLockHeld returns false for stale lock', () => {
    mkdirSync(TEST_DIR, { recursive: true })
    const lockPath = testLockPath()

    writeFileSync(
      lockPath,
      JSON.stringify({
        sessionId: 'stale',
        pid: 2147483647,
        acquiredAt: new Date().toISOString(),
      }),
    )

    expect(isLockHeld(lockPath)).toBe(false)
  })

  it('releaseLock is idempotent on missing file', () => {
    const lockPath = testLockPath()
    // Should not throw
    expect(() => releaseLock(lockPath)).not.toThrow()
  })
})
