/**
 * File-based lock for computer-use (same pattern as Claude Code)
 * Prevents concurrent computer-use sessions from conflicting.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  constants,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export interface LockData {
  sessionId: string
  pid: number
  acquiredAt: string
}

const DEFAULT_LOCK_PATH = join(
  homedir(),
  '.local',
  'share',
  'linux-cowork',
  'computer-use.lock',
)

/**
 * Check if a process with the given PID is still alive.
 */
function isPidAlive(pid: number): boolean {
  try {
    // signal 0 doesn't kill, just checks existence
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Read and parse lock file contents. Returns null if unreadable.
 */
function readLockData(lockPath: string): LockData | null {
  try {
    const raw = readFileSync(lockPath, 'utf-8')
    return JSON.parse(raw) as LockData
  } catch {
    return null
  }
}

/**
 * Acquire the computer-use lock.
 * Uses O_CREAT | O_EXCL for atomic creation (fails if file already exists).
 * Recovers stale locks where the owning PID is dead.
 *
 * @returns The lock data on success
 * @throws If lock is already held by a live process
 */
export function acquireLock(
  sessionId: string,
  lockPath: string = DEFAULT_LOCK_PATH,
): LockData {
  // Ensure parent directory exists
  const dir = dirname(lockPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const lockData: LockData = {
    sessionId,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  }
  const content = JSON.stringify(lockData, null, 2)

  try {
    // Atomic create — fails if file already exists
    const fd = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL)
    writeFileSync(fd, content, 'utf-8')
    closeSync(fd)
    return lockData
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err
    }
  }

  // Lock file exists — check if stale
  const existing = readLockData(lockPath)
  if (existing && !isPidAlive(existing.pid)) {
    // Stale lock — remove and retry
    try {
      unlinkSync(lockPath)
    } catch {
      // race condition, another process may have removed it
    }
    // Retry once
    const fd = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL)
    writeFileSync(fd, content, 'utf-8')
    closeSync(fd)
    return lockData
  }

  throw new Error(
    `Computer-use lock held by session ${existing?.sessionId ?? 'unknown'} (PID ${existing?.pid ?? '?'})`,
  )
}

/**
 * Release the computer-use lock.
 * Only releases if the lock is owned by the current process.
 */
export function releaseLock(lockPath: string = DEFAULT_LOCK_PATH): void {
  if (!existsSync(lockPath)) return

  const data = readLockData(lockPath)
  if (data && data.pid !== process.pid) {
    throw new Error(
      `Cannot release lock owned by PID ${data.pid} (current PID: ${process.pid})`,
    )
  }

  try {
    unlinkSync(lockPath)
  } catch {
    // already removed
  }
}

/**
 * Check current lock status without acquiring.
 * Returns the lock data if held, null otherwise.
 */
export function checkLock(lockPath: string = DEFAULT_LOCK_PATH): LockData | null {
  if (!existsSync(lockPath)) return null
  return readLockData(lockPath)
}

/**
 * Check if the lock is currently held by a live process.
 */
export function isLockHeld(lockPath: string = DEFAULT_LOCK_PATH): boolean {
  const data = checkLock(lockPath)
  if (!data) return false
  return isPidAlive(data.pid)
}
