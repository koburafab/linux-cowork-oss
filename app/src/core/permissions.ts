/**
 * Permission system — checks operations against allow/deny/ask rules
 * Inspired by Claude Code's permission model, simplified for linux-cowork
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'

// --- Types ---

export type PermissionAction = 'allow' | 'deny' | 'ask'

export interface PermissionRule {
  pattern: string
  action: PermissionAction
}

export type PermissionMode = 'default' | 'auto' | 'restricted'

export interface PermissionResult {
  allowed: boolean
  reason: string
}

export interface PermissionsConfig {
  mode?: PermissionMode
  allow?: string[]
  deny?: string[]
}

// --- Default rules ---

const DEFAULT_DENY_PATTERNS: string[] = [
  'rm -rf',
  'rm -fr',
  '.git/',
  '.git\\',
  '/.git',
  '.ssh/',
  '.ssh\\',
  '/.ssh',
  '.gnupg/',
  '.gnupg\\',
  '/.gnupg',
  '.env',
  'chmod 777',
  'mkfs.',
  'dd if=',
  ':(){:|:&};:',
]

const DEFAULT_ALLOW_PATTERNS: string[] = [
  'read:',
  'cat ',
  'ls ',
  'head ',
  'tail ',
  'grep ',
  'find ',
  'stat ',
  'file ',
  'wc ',
  'write:project/',
  'mkdir:project/',
  'echo ',
  'pwd',
  'whoami',
  'date',
  'uname',
]

const DEFAULT_ASK_PATTERNS: string[] = [
  'write:/',
  'write:~/',
  'npm install',
  'bun install',
  'apt ',
  'sudo ',
  'curl ',
  'wget ',
  'fetch:',
  'pip install',
]

// --- Pattern matching ---

/**
 * Simple glob-style pattern matching
 * Supports: * (any chars), ? (single char), ** (recursive)
 * For simple strings (no globs): matches if input starts with pattern
 * or if pattern appears after a space or path separator in input
 */
export function matchPattern(input: string, pattern: string): boolean {
  // Exact match
  if (input === pattern) return true

  // If pattern has no glob chars, use startsWith / boundary matching
  if (!pattern.includes('*') && !pattern.includes('?')) {
    // Pattern at start of input
    if (input.startsWith(pattern)) return true
    // Pattern after a space (command argument)
    if (input.includes(` ${pattern}`)) return true
    // Pattern after a path separator
    if (input.includes(`/${pattern}`)) return true
    if (input.includes(`\\${pattern}`)) return true
    return false
  }

  // Convert glob to regex (anchored to full string)
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex specials (not * and ?)
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')

  const regex = new RegExp(`^${regexStr}$`)
  return regex.test(input)
}

// --- Config loading ---

function getSettingsPath(): string {
  return path.join(os.homedir(), '.config', 'linux-cowork', 'settings.json')
}

/**
 * Load permission rules from settings.json
 * Merges with defaults; user rules take priority
 */
export function loadPermissionRules(settingsPath?: string): {
  mode: PermissionMode
  rules: PermissionRule[]
  userRules: PermissionRule[]
} {
  const filePath = settingsPath || getSettingsPath()
  let config: PermissionsConfig = {}

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    config = parsed.permissions || {}
  } catch {
    // No file or invalid — use defaults only
  }

  const rules: PermissionRule[] = []
  const userRules: PermissionRule[] = []

  // User deny rules first (highest priority)
  if (config.deny) {
    for (const p of config.deny) {
      const rule = { pattern: p, action: 'deny' as const }
      rules.push(rule)
      userRules.push(rule)
    }
  }

  // Default deny rules
  for (const p of DEFAULT_DENY_PATTERNS) {
    rules.push({ pattern: p, action: 'deny' })
  }

  // User allow rules
  if (config.allow) {
    for (const p of config.allow) {
      const rule = { pattern: p, action: 'allow' as const }
      rules.push(rule)
      userRules.push(rule)
    }
  }

  // Default ask rules
  for (const p of DEFAULT_ASK_PATTERNS) {
    rules.push({ pattern: p, action: 'ask' })
  }

  // Default allow rules (lowest priority)
  for (const p of DEFAULT_ALLOW_PATTERNS) {
    rules.push({ pattern: p, action: 'allow' })
  }

  return {
    mode: config.mode || 'default',
    rules,
    userRules,
  }
}

// --- Main check ---

/**
 * Check if an operation is permitted
 * @param operation — the command or action string (e.g. "rm -rf /tmp", "read: /etc/hosts")
 * @param path — optional filesystem path involved
 * @param settingsPath — optional custom settings path (for testing)
 */
export function checkPermission(
  operation: string,
  filePath?: string,
  settingsPath?: string,
): PermissionResult {
  const { mode, rules, userRules } = loadPermissionRules(settingsPath)

  // Build the full string to match against
  const target = filePath ? `${operation} ${filePath}` : operation

  // Restricted mode: deny everything except user-configured allows
  if (mode === 'restricted') {
    for (const rule of userRules) {
      if (rule.action === 'allow' && matchPattern(target, rule.pattern)) {
        return { allowed: true, reason: `Allowed by rule: ${rule.pattern}` }
      }
    }
    return { allowed: false, reason: 'Restricted mode: operation not explicitly allowed' }
  }

  // Auto mode: allow everything except explicit denies
  if (mode === 'auto') {
    for (const rule of rules) {
      if (rule.action === 'deny' && matchPattern(target, rule.pattern)) {
        return { allowed: false, reason: `Denied by rule: ${rule.pattern}` }
      }
    }
    return { allowed: true, reason: 'Auto mode: operation allowed' }
  }

  // Default mode: check rules in priority order
  // First pass: check deny rules
  for (const rule of rules) {
    if (rule.action === 'deny' && matchPattern(target, rule.pattern)) {
      return { allowed: false, reason: `Denied by rule: ${rule.pattern}` }
    }
  }

  // Second pass: check allow rules
  for (const rule of rules) {
    if (rule.action === 'allow' && matchPattern(target, rule.pattern)) {
      return { allowed: true, reason: `Allowed by rule: ${rule.pattern}` }
    }
  }

  // Third pass: check ask rules (treated as denied with "needs confirmation" reason)
  for (const rule of rules) {
    if (rule.action === 'ask' && matchPattern(target, rule.pattern)) {
      return { allowed: false, reason: `Requires confirmation: ${rule.pattern}` }
    }
  }

  // No rule matched — deny by default
  return { allowed: false, reason: 'No matching rule: denied by default' }
}
