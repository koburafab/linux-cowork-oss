import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  loadSettings,
  saveSettings,
  getDefaultSettings,
} from '../src/core/settings'

describe('Settings', () => {
  let tmpDir: string
  let settingsPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-settings-'))
    settingsPath = path.join(tmpDir, 'settings.json')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('getDefaultSettings', () => {
    it('should return sensible defaults', () => {
      const defaults = getDefaultSettings()
      expect(defaults.activeModel).toBe('claude-sonnet')
      expect(defaults.theme).toBe('dark')
      expect(defaults.maxTokens).toBe(4096)
      expect(defaults.temperature).toBe(0.7)
      expect(defaults.ollamaUrl).toBe('http://localhost:11434')
      expect(defaults.anthropicApiKey).toBe('')
      expect(defaults.systemPrompt).toContain('helpful AI assistant')
    })
  })

  describe('loadSettings', () => {
    it('should return defaults when file does not exist', () => {
      const settings = loadSettings(path.join(tmpDir, 'nonexistent.json'))
      expect(settings).toEqual(getDefaultSettings())
    })

    it('should load settings from file', () => {
      const custom = { activeModel: 'ollama-local', theme: 'light' }
      fs.writeFileSync(settingsPath, JSON.stringify(custom), 'utf-8')

      const settings = loadSettings(settingsPath)
      expect(settings.activeModel).toBe('ollama-local')
      expect(settings.theme).toBe('light')
      // Other fields should be defaults
      expect(settings.maxTokens).toBe(4096)
    })

    it('should return defaults on invalid JSON', () => {
      fs.writeFileSync(settingsPath, 'not json!!!', 'utf-8')

      const settings = loadSettings(settingsPath)
      expect(settings).toEqual(getDefaultSettings())
    })
  })

  describe('saveSettings', () => {
    it('should save settings to disk', () => {
      const settings = getDefaultSettings()
      settings.theme = 'light'
      settings.maxTokens = 8192

      saveSettings(settings, settingsPath)

      const raw = fs.readFileSync(settingsPath, 'utf-8')
      const loaded = JSON.parse(raw)
      expect(loaded.theme).toBe('light')
      expect(loaded.maxTokens).toBe(8192)
    })

    it('should create parent directories', () => {
      const deepPath = path.join(tmpDir, 'a', 'b', 'settings.json')
      saveSettings(getDefaultSettings(), deepPath)

      expect(fs.existsSync(deepPath)).toBe(true)
    })

    it('should roundtrip correctly', () => {
      const original = getDefaultSettings()
      original.temperature = 0.3
      original.anthropicApiKey = 'sk-test-123'

      saveSettings(original, settingsPath)
      const loaded = loadSettings(settingsPath)

      expect(loaded).toEqual(original)
    })
  })
})
