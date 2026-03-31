/**
 * Mouse & Keyboard control for Linux (X11 + Wayland)
 * Equivalent of Claude Code's enigo-based input system
 */

import { execSync } from 'node:child_process'

type DisplayServer = 'x11' | 'wayland'

function getDisplayServer(): DisplayServer {
  if (
    process.env.XDG_SESSION_TYPE?.toLowerCase() === 'wayland' ||
    process.env.WAYLAND_DISPLAY
  ) {
    return 'wayland'
  }
  return 'x11'
}

function run(cmd: string): void {
  execSync(cmd, { stdio: 'pipe' })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- Mouse ---

export async function mouseMove(x: number, y: number): Promise<void> {
  const ds = getDisplayServer()
  if (ds === 'wayland') {
    run(`ydotool mousemove --absolute -x ${x} -y ${y}`)
  } else {
    run(`xdotool mousemove --sync ${x} ${y}`)
  }
  await sleep(50) // HID settle delay (same as Claude Code)
}

export async function mouseClick(
  button: 'left' | 'right' | 'middle' = 'left',
  count: 1 | 2 | 3 = 1,
): Promise<void> {
  const buttonMap = { left: 1, middle: 2, right: 3 }
  const btn = buttonMap[button]
  const ds = getDisplayServer()

  if (ds === 'wayland') {
    for (let i = 0; i < count; i++) {
      run(`ydotool click ${btn}`)
      if (i < count - 1) await sleep(50)
    }
  } else {
    run(`xdotool click --repeat ${count} --delay 50 ${btn}`)
  }
}

export async function mouseDrag(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Promise<void> {
  const ds = getDisplayServer()
  if (ds === 'wayland') {
    run(`ydotool mousemove --absolute -x ${fromX} -y ${fromY}`)
    run(`ydotool mousedown 1`)
    run(`ydotool mousemove --absolute -x ${toX} -y ${toY}`)
    run(`ydotool mouseup 1`)
  } else {
    run(
      `xdotool mousemove --sync ${fromX} ${fromY} mousedown 1 mousemove --sync ${toX} ${toY} mouseup 1`,
    )
  }
}

// --- Keyboard ---

export async function keyPress(keys: string): Promise<void> {
  const ds = getDisplayServer()
  if (ds === 'wayland') {
    // ydotool uses key codes, convert common combos
    run(`ydotool key ${keys}`)
  } else {
    run(`xdotool key ${keys}`)
  }
}

export async function typeText(text: string): Promise<void> {
  const ds = getDisplayServer()
  if (ds === 'wayland') {
    run(`ydotool type -- "${text.replace(/"/g, '\\"')}"`)
  } else {
    // For long text, use clipboard paste (same pattern as Claude Code)
    if (text.length > 50) {
      await typeViaClipboard(text)
    } else {
      run(`xdotool type --delay 8 -- "${text.replace(/"/g, '\\"')}"`)
    }
  }
}

async function typeViaClipboard(text: string): Promise<void> {
  // Save current clipboard
  let savedClipboard = ''
  try {
    savedClipboard = execSync('xclip -selection clipboard -o', {
      stdio: 'pipe',
    }).toString()
  } catch {
    // empty clipboard
  }

  // Write text to clipboard
  execSync(`echo -n "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`, {
    stdio: 'pipe',
  })

  // Paste
  run('xdotool key ctrl+v')
  await sleep(100) // wait for paste to complete

  // Restore clipboard
  if (savedClipboard) {
    execSync(
      `echo -n "${savedClipboard.replace(/"/g, '\\"')}" | xclip -selection clipboard`,
      { stdio: 'pipe' },
    )
  }
}

// --- Window Management ---

export function getActiveWindow(): string {
  try {
    return execSync('xdotool getactivewindow', { stdio: 'pipe' })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

export function focusWindow(windowId: string): void {
  run(`xdotool windowactivate ${windowId}`)
}

export function minimizeWindow(windowId: string): void {
  run(`xdotool windowminimize ${windowId}`)
}

export function listWindows(): Array<{
  id: string
  title: string
  class: string
}> {
  try {
    const output = execSync('wmctrl -l -x', { stdio: 'pipe' }).toString()
    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/)
        return {
          id: parts[0],
          class: parts[2] || '',
          title: parts.slice(4).join(' '),
        }
      })
  } catch {
    return []
  }
}
