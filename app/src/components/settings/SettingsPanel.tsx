import { useState, useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { getSettings, updateSettings } from '../../api/client'

interface SettingsData {
  apiKeys: {
    deepseek: string
    moonshot: string
    anthropic: string
    openrouter: string
  }
  model: string
  advanced: {
    ollamaUrl: string
    temperature: number
    maxTokens: number
    systemPrompt: string
  }
}

const EMPTY_SETTINGS: SettingsData = {
  apiKeys: { deepseek: '', moonshot: '', anthropic: '', openrouter: '' },
  model: '',
  advanced: {
    ollamaUrl: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
  },
}

const API_KEY_FIELDS = [
  { key: 'deepseek' as const, label: 'DeepSeek API Key', models: 'DeepSeek Chat/Reasoner' },
  { key: 'moonshot' as const, label: 'Moonshot (Kimi) API Key', models: 'Kimi K2' },
  { key: 'anthropic' as const, label: 'Anthropic API Key', models: 'Claude Sonnet/Haiku' },
  { key: 'openrouter' as const, label: 'OpenRouter API Key', models: 'OpenRouter models' },
]

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<SettingsData>(EMPTY_SETTINGS)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  const availableModels = useChatStore((s) => s.availableModels)
  const activeModel = useChatStore((s) => s.activeModel)
  const setActiveModel = useChatStore((s) => s.setActiveModel)

  // Load settings on mount
  useEffect(() => {
    getSettings()
      .then((data) => {
        const s = data as Partial<SettingsData>
        setSettings({
          apiKeys: { ...EMPTY_SETTINGS.apiKeys, ...s.apiKeys },
          model: s.model || activeModel.id,
          advanced: { ...EMPTY_SETTINGS.advanced, ...s.advanced },
        })
      })
      .catch(() => {
        setSettings({ ...EMPTY_SETTINGS, model: activeModel.id })
      })
      .finally(() => setLoading(false))
  }, [activeModel.id])

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = useCallback(async () => {
    await updateSettings(settings as unknown as Record<string, unknown>)
    // Update active model in store if changed
    const newModel = availableModels.find((m) => m.id === settings.model)
    if (newModel) setActiveModel(newModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [settings, availableModels, setActiveModel])

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updateApiKey = (key: keyof SettingsData['apiKeys'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [key]: value },
    }))
  }

  const updateAdvanced = (key: keyof SettingsData['advanced'], value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      advanced: { ...prev.advanced, [key]: value },
    }))
  }

  if (loading) {
    return (
      <div className="settings-overlay">
        <div className="settings-panel" ref={panelRef}>
          <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel" ref={panelRef}>
        <div className="settings-panel__header">
          <h2 className="settings-panel__title">Settings</h2>
          <button className="settings-panel__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-panel__body">
          {/* API Keys */}
          <section className="settings-section">
            <h3 className="settings-section__title">API Keys</h3>
            {API_KEY_FIELDS.map((field) => (
              <div className="settings-field" key={field.key}>
                <label className="settings-field__label">{field.label}</label>
                <div className="settings-field__input-wrap">
                  <input
                    type={visibleKeys[field.key] ? 'text' : 'password'}
                    className="settings-field__input"
                    placeholder="sk-..."
                    value={settings.apiKeys[field.key]}
                    onChange={(e) => updateApiKey(field.key, e.target.value)}
                  />
                  <button
                    type="button"
                    className="settings-field__eye"
                    onClick={() => toggleKeyVisibility(field.key)}
                    title={visibleKeys[field.key] ? 'Hide' : 'Show'}
                  >
                    {visibleKeys[field.key] ? '🙈' : '👁'}
                  </button>
                </div>
                {!settings.apiKeys[field.key] && (
                  <span className="settings-field__warning">
                    Required for {field.models}
                  </span>
                )}
              </div>
            ))}
          </section>

          {/* Model */}
          <section className="settings-section">
            <h3 className="settings-section__title">Model</h3>
            <div className="settings-field">
              <label className="settings-field__label">Active Model</label>
              <select
                className="settings-field__select"
                value={settings.model}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, model: e.target.value }))
                }
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Advanced */}
          <section className="settings-section">
            <h3 className="settings-section__title">Advanced</h3>

            <div className="settings-field">
              <label className="settings-field__label">Ollama URL</label>
              <input
                type="text"
                className="settings-field__input"
                value={settings.advanced.ollamaUrl}
                onChange={(e) => updateAdvanced('ollamaUrl', e.target.value)}
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label">
                Temperature: {settings.advanced.temperature}
              </label>
              <input
                type="range"
                className="settings-field__slider"
                min={0}
                max={1}
                step={0.1}
                value={settings.advanced.temperature}
                onChange={(e) =>
                  updateAdvanced('temperature', parseFloat(e.target.value))
                }
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label">Max Tokens</label>
              <input
                type="number"
                className="settings-field__input settings-field__input--short"
                value={settings.advanced.maxTokens}
                onChange={(e) =>
                  updateAdvanced('maxTokens', parseInt(e.target.value, 10) || 0)
                }
              />
            </div>

            <div className="settings-field">
              <label className="settings-field__label">System Prompt</label>
              <textarea
                className="settings-field__textarea"
                rows={4}
                value={settings.advanced.systemPrompt}
                onChange={(e) => updateAdvanced('systemPrompt', e.target.value)}
                placeholder="Optional system prompt..."
              />
            </div>
          </section>
        </div>

        <div className="settings-panel__footer">
          {saved && <span className="settings-panel__saved">Saved!</span>}
          <button className="settings-panel__save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
