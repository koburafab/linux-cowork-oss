/**
 * Settings system — persistent configuration with hot-reload
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { watch } from 'chokidar'

export interface ApiKeys {
  anthropic?: string
  deepseek?: string
  moonshot?: string
  openrouter?: string
  [key: string]: string | undefined
}

export interface Settings {
  activeModel: string
  theme: 'dark' | 'light' | 'auto'
  maxTokens: number
  temperature: number
  ollamaUrl: string
  anthropicApiKey: string
  apiKeys: ApiKeys
  systemPrompt: string
}

const DEFAULT_SETTINGS: Settings = {
  activeModel: 'deepseek-chat',
  theme: 'dark',
  maxTokens: 4096,
  temperature: 0.7,
  ollamaUrl: 'http://localhost:11434',
  anthropicApiKey: '',
  apiKeys: {},
  systemPrompt:
    'You are a helpful AI assistant running on Linux. You can see the screen, control mouse/keyboard, and manage files.',
}

function getSettingsPath(): string {
  return path.join(os.homedir(), '.config', 'linux-cowork', 'settings.json')
}

/**
 * Load settings from disk, merging with defaults
 */
export function loadSettings(settingsPath?: string): Settings {
  const filePath = settingsPath || getSettingsPath()

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    // File doesn't exist or is invalid — return defaults
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Save settings to disk, creating parent directories as needed
 */
export function saveSettings(settings: Settings, settingsPath?: string): void {
  const filePath = settingsPath || getSettingsPath()
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}

/**
 * Watch settings file for changes, calling callback on each change
 * Returns a cleanup function to stop watching
 */
export function watchSettings(
  callback: (settings: Settings) => void,
  settingsPath?: string,
): () => void {
  const filePath = settingsPath || getSettingsPath()

  const watcher = watch(filePath, {
    persistent: false,
    ignoreInitial: true,
  })

  watcher.on('change', () => {
    const settings = loadSettings(filePath)
    callback(settings)
  })

  return () => {
    watcher.close()
  }
}

/**
 * Get the default settings (useful for reset)
 */
export function getDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS }
}
