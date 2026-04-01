/**
 * Real screenshot capture tests
 * Attempts actual capture if a display server is available, skips gracefully otherwise.
 */

import { describe, it, expect, afterAll } from 'vitest'
import { existsSync, mkdirSync, statSync, readFileSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { captureScreenshot, cleanupScreenshot } from '../src/core/computer-use/screenshot'

const SCREENSHOT_DIR = join(__dirname, 'screenshots')
const SCREENSHOT_PATH = join(SCREENSHOT_DIR, 'test-capture.jpg')

// Track files to cleanup
const filesToClean: string[] = []

// Check if screenshot capture actually works (not just env vars)
function canCapture(): boolean {
  try {
    // Try a real capture to a temp file to see if the compositor supports it
    const testPath = `/tmp/cowork-screenshot-test-${Date.now()}`
    if (process.env.WAYLAND_DISPLAY) {
      execSync(`grim ${testPath}.png`, { stdio: 'pipe', timeout: 5000 })
      unlinkSync(`${testPath}.png`)
      return true
    }
    if (process.env.DISPLAY) {
      execSync(`scrot ${testPath}.jpg`, { stdio: 'pipe', timeout: 5000 })
      unlinkSync(`${testPath}.jpg`)
      return true
    }
    return false
  } catch {
    return false
  }
}

const hasDisplay = canCapture()

// Ensure screenshots directory exists
mkdirSync(SCREENSHOT_DIR, { recursive: true })

describe('Screenshot - Real capture', () => {
  afterAll(() => {
    // Clean up any leftover temp files (not the test-capture.jpg, keep for inspection)
    for (const f of filesToClean) {
      try {
        if (existsSync(f)) unlinkSync(f)
      } catch {
        // ignore
      }
    }
  })

  it.skipIf(!hasDisplay)('should capture a real screenshot', async () => {
    const result = await captureScreenshot({ mode: 'fullscreen', quality: 50 })
    expect(result).toBeDefined()
    expect(result.path).toBeTruthy()
    expect(existsSync(result.path)).toBe(true)

    // Copy to our test directory for inspection
    const buffer = readFileSync(result.path)
    const { writeFileSync } = await import('node:fs')
    writeFileSync(SCREENSHOT_PATH, buffer)

    filesToClean.push(result.path)
  })

  it.skipIf(!hasDisplay)('should produce a file with size > 0', async () => {
    // If previous test saved the file, check it; otherwise capture fresh
    if (!existsSync(SCREENSHOT_PATH)) {
      const result = await captureScreenshot({ mode: 'fullscreen', quality: 50 })
      const buffer = readFileSync(result.path)
      const { writeFileSync } = await import('node:fs')
      writeFileSync(SCREENSHOT_PATH, buffer)
      filesToClean.push(result.path)
    }

    const stat = statSync(SCREENSHOT_PATH)
    expect(stat.size).toBeGreaterThan(0)
  })

  it.skipIf(!hasDisplay)('should produce a valid JPEG (magic bytes FF D8 FF)', async () => {
    if (!existsSync(SCREENSHOT_PATH)) {
      const result = await captureScreenshot({ mode: 'fullscreen', quality: 50 })
      const buffer = readFileSync(result.path)
      const { writeFileSync } = await import('node:fs')
      writeFileSync(SCREENSHOT_PATH, buffer)
      filesToClean.push(result.path)
    }

    const buffer = readFileSync(SCREENSHOT_PATH)
    // JPEG magic bytes: FF D8 FF
    expect(buffer[0]).toBe(0xff)
    expect(buffer[1]).toBe(0xd8)
    expect(buffer[2]).toBe(0xff)
  })

  it.skipIf(!hasDisplay)('should return base64 data', async () => {
    const result = await captureScreenshot({ mode: 'fullscreen', quality: 30 })
    expect(result.base64).toBeDefined()
    expect(result.base64!.length).toBeGreaterThan(0)

    // base64 should decode without error
    const decoded = Buffer.from(result.base64!, 'base64')
    expect(decoded.length).toBeGreaterThan(0)

    filesToClean.push(result.path)
  })

  it.skipIf(!hasDisplay)('cleanupScreenshot should delete the file', async () => {
    const result = await captureScreenshot({ mode: 'fullscreen', quality: 30 })
    expect(existsSync(result.path)).toBe(true)

    cleanupScreenshot(result.path)
    expect(existsSync(result.path)).toBe(false)
  })

  it('should skip gracefully when capture is not available', () => {
    if (!hasDisplay) {
      console.log(
        'Screenshot tests skipped: capture not available (no display or compositor does not support screencopy).',
      )
    }
    // This test always passes — it documents the skip behavior
    expect(true).toBe(true)
  })

  it('cleanupScreenshot should not throw on non-existent file', () => {
    expect(() => cleanupScreenshot('/tmp/non-existent-file-xyz.jpg')).not.toThrow()
  })

  it('cleanupScreenshot should not throw on empty path', () => {
    expect(() => cleanupScreenshot('')).not.toThrow()
  })
})
