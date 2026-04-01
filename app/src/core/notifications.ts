/**
 * Desktop notifications via notify-send (Linux)
 */

import { execSync } from 'node:child_process'

let notifySendAvailable: boolean | null = null

function checkNotifySend(): boolean {
  if (notifySendAvailable !== null) return notifySendAvailable
  try {
    execSync('which notify-send', { stdio: 'ignore' })
    notifySendAvailable = true
  } catch {
    console.warn('[notifications] notify-send not found — desktop notifications disabled')
    notifySendAvailable = false
  }
  return notifySendAvailable
}

export function notify(title: string, body: string): void {
  if (!checkNotifySend()) return
  try {
    // Sanitize inputs to prevent command injection
    const safeTitle = title.replace(/["\\$`]/g, '')
    const safeBody = body.replace(/["\\$`]/g, '')
    execSync(`notify-send "${safeTitle}" "${safeBody}"`, { stdio: 'ignore' })
  } catch (err) {
    console.warn('[notifications] Failed to send notification:', err)
  }
}
