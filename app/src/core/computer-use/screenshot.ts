/**
 * Screenshot capture for Linux (X11 + Wayland)
 * Equivalent of Claude Code's Swift-based screenshot system
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface ScreenshotOptions {
  /** Capture full screen or active window */
  mode: 'fullscreen' | 'window' | 'region'
  /** JPEG quality (0-100) */
  quality?: number
  /** Max width (auto-resize) */
  maxWidth?: number
  /** Delay in seconds before capture */
  delay?: number
}

export interface ScreenshotResult {
  path: string
  width: number
  height: number
  base64?: string
}

type DisplayServer = 'x11' | 'wayland' | 'unknown'

function detectDisplayServer(): DisplayServer {
  const session = process.env.XDG_SESSION_TYPE?.toLowerCase()
  if (session === 'wayland') return 'wayland'
  if (session === 'x11') return 'x11'
  if (process.env.WAYLAND_DISPLAY) return 'wayland'
  if (process.env.DISPLAY) return 'x11'
  return 'unknown'
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export async function captureScreenshot(
  options: ScreenshotOptions = { mode: 'fullscreen' },
): Promise<ScreenshotResult> {
  const display = detectDisplayServer()
  const quality = options.quality ?? 75
  const outPath = join(tmpdir(), `cowork-screenshot-${Date.now()}.jpg`)

  // GNOME Wayland: gnome-screenshot works, grim doesn't (no wlr-screencopy)
  if (hasCommand('gnome-screenshot')) {
    return captureGnome(outPath, options, quality)
  }
  if (display === 'wayland') {
    return captureWayland(outPath, options, quality)
  }
  return captureX11(outPath, options, quality)
}

async function captureGnome(
  outPath: string,
  options: ScreenshotOptions,
  _quality: number,
): Promise<ScreenshotResult> {
  const pngPath = outPath.replace('.jpg', '.png')

  switch (options.mode) {
    case 'window':
      execSync(`gnome-screenshot -w -f "${pngPath}"`, { stdio: 'pipe' })
      break
    default:
      execSync(`gnome-screenshot -f "${pngPath}"`, { stdio: 'pipe' })
  }

  // Convert to JPEG for smaller size
  if (hasCommand('convert')) {
    execSync(`convert "${pngPath}" -quality ${_quality} "${outPath}"`, { stdio: 'pipe' })
    unlinkSync(pngPath)
    return processScreenshot(outPath, options.maxWidth)
  }

  return processScreenshot(pngPath, options.maxWidth)
}

async function captureX11(
  outPath: string,
  options: ScreenshotOptions,
  quality: number,
): Promise<ScreenshotResult> {
  if (!hasCommand('scrot')) {
    throw new Error('scrot not installed. Run: sudo apt install scrot')
  }

  const args = [`--quality`, `${quality}`]

  if (options.delay) {
    args.push(`--delay`, `${options.delay}`)
  }

  switch (options.mode) {
    case 'window':
      args.push('--focused')
      break
    case 'region':
      args.push('--select')
      break
    // fullscreen is default
  }

  args.push(outPath)

  execSync(`scrot ${args.join(' ')}`, { stdio: 'pipe' })

  return processScreenshot(outPath, options.maxWidth)
}

async function captureWayland(
  outPath: string,
  options: ScreenshotOptions,
  _quality: number,
): Promise<ScreenshotResult> {
  if (!hasCommand('grim')) {
    throw new Error('grim not installed. Run: sudo apt install grim')
  }

  const pngPath = outPath.replace('.jpg', '.png')

  switch (options.mode) {
    case 'region':
      if (hasCommand('slurp')) {
        const region = execSync('slurp', { stdio: 'pipe' }).toString().trim()
        execSync(`grim -g "${region}" ${pngPath}`, { stdio: 'pipe' })
      } else {
        execSync(`grim ${pngPath}`, { stdio: 'pipe' })
      }
      break
    default:
      execSync(`grim ${pngPath}`, { stdio: 'pipe' })
  }

  // Convert PNG to JPEG for smaller size
  if (hasCommand('convert')) {
    execSync(`convert ${pngPath} -quality ${_quality} ${outPath}`, {
      stdio: 'pipe',
    })
    unlinkSync(pngPath)
  } else {
    // Fallback: use PNG directly
    return processScreenshot(pngPath, options.maxWidth)
  }

  return processScreenshot(outPath, options.maxWidth)
}

async function processScreenshot(
  path: string,
  maxWidth?: number,
): Promise<ScreenshotResult> {
  if (!existsSync(path)) {
    throw new Error(`Screenshot failed: file not created at ${path}`)
  }

  // Get dimensions
  let width = 0
  let height = 0
  try {
    if (hasCommand('identify')) {
      const dims = execSync(`identify -format "%wx%h" "${path}"`, {
        stdio: 'pipe',
      })
        .toString()
        .trim()
      const [w, h] = dims.split('x').map(Number)
      width = w
      height = h
    }
  } catch {
    // dimensions unknown
  }

  // Resize if needed
  if (maxWidth && width > maxWidth && hasCommand('convert')) {
    execSync(`convert "${path}" -resize ${maxWidth}x "${path}"`, {
      stdio: 'pipe',
    })
    // Re-read dimensions
    try {
      const dims = execSync(`identify -format "%wx%h" "${path}"`, {
        stdio: 'pipe',
      })
        .toString()
        .trim()
      const [w, h] = dims.split('x').map(Number)
      width = w
      height = h
    } catch {
      // ignore
    }
  }

  // Read as base64
  const buffer = readFileSync(path)
  const base64 = buffer.toString('base64')

  return { path, width, height, base64 }
}

export function cleanupScreenshot(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path)
  } catch {
    // ignore cleanup errors
  }
}
