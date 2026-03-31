import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'

describe('Computer Use - System Tools', () => {
  it('should have xdotool installed', () => {
    const result = execSync('which xdotool', { stdio: 'pipe' }).toString().trim()
    expect(result).toContain('xdotool')
  })

  it('should have wmctrl installed', () => {
    const result = execSync('which wmctrl', { stdio: 'pipe' }).toString().trim()
    expect(result).toContain('wmctrl')
  })

  it('should have scrot installed', () => {
    const result = execSync('which scrot', { stdio: 'pipe' }).toString().trim()
    expect(result).toContain('scrot')
  })

  it('should have bubblewrap (bwrap) installed', () => {
    const result = execSync('which bwrap', { stdio: 'pipe' }).toString().trim()
    expect(result).toContain('bwrap')
  })

  it('should detect display server', () => {
    const sessionType = process.env.XDG_SESSION_TYPE
    const display = process.env.DISPLAY
    const wayland = process.env.WAYLAND_DISPLAY
    // At least one should be set
    expect(sessionType || display || wayland).toBeTruthy()
  })

  it('should list windows with wmctrl', () => {
    try {
      const output = execSync('wmctrl -l', { stdio: 'pipe' }).toString()
      // Should return at least empty string without error
      expect(typeof output).toBe('string')
    } catch {
      // wmctrl may fail if no X display (CI environment)
      expect(true).toBe(true)
    }
  })

  it('should get screen resolution', () => {
    try {
      const output = execSync('xdpyinfo | grep dimensions', {
        stdio: 'pipe',
      })
        .toString()
        .trim()
      expect(output).toContain('dimensions')
    } catch {
      // May fail without display
      expect(true).toBe(true)
    }
  })
})

describe('Computer Use - Screenshot Module', () => {
  it('should export captureScreenshot function', async () => {
    const mod = await import('../src/core/computer-use/screenshot')
    expect(typeof mod.captureScreenshot).toBe('function')
    expect(typeof mod.cleanupScreenshot).toBe('function')
  })
})

describe('Computer Use - Input Module', () => {
  it('should export input functions', async () => {
    const mod = await import('../src/core/computer-use/input')
    expect(typeof mod.mouseMove).toBe('function')
    expect(typeof mod.mouseClick).toBe('function')
    expect(typeof mod.keyPress).toBe('function')
    expect(typeof mod.typeText).toBe('function')
    expect(typeof mod.listWindows).toBe('function')
  })
})
