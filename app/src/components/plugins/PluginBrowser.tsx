import { useState, useEffect, useRef, useCallback } from 'react'
import { getPlugins, togglePlugin, type Plugin } from '../../api/client'

interface Props {
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  builtin: 'Built-in',
  skill: 'Skill',
  mcp: 'MCP',
}

export function PluginBrowser({ onClose }: Props) {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'builtin' | 'skill' | 'mcp'>('all')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPlugins()
      .then((data) => setPlugins(data.plugins))
      .catch(() => setPlugins([]))
      .finally(() => setLoading(false))
  }, [])

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

  const handleToggle = useCallback(async (plugin: Plugin) => {
    if (plugin.type === 'builtin') return
    try {
      const result = await togglePlugin(plugin.id)
      setPlugins((prev) =>
        prev.map((p) => (p.id === plugin.id ? { ...p, enabled: result.enabled } : p)),
      )
    } catch {
      // Toggle failed silently
    }
  }, [])

  const filtered = filter === 'all' ? plugins : plugins.filter((p) => p.type === filter)

  const counts = {
    all: plugins.length,
    builtin: plugins.filter((p) => p.type === 'builtin').length,
    skill: plugins.filter((p) => p.type === 'skill').length,
    mcp: plugins.filter((p) => p.type === 'mcp').length,
  }

  if (loading) {
    return (
      <div className="plugin-browser-overlay">
        <div className="plugin-browser" ref={panelRef}>
          <p style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>Loading plugins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="plugin-browser-overlay">
      <div className="plugin-browser" ref={panelRef}>
        <div className="plugin-browser__header">
          <h2 className="plugin-browser__title">Plugins</h2>
          <button className="plugin-browser__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="plugin-browser__filters">
          {(['all', 'builtin', 'skill', 'mcp'] as const).map((f) => (
            <button
              key={f}
              className={`plugin-browser__filter-btn${filter === f ? ' plugin-browser__filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : TYPE_LABELS[f]} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="plugin-browser__body">
          {filtered.length === 0 ? (
            <p className="plugin-browser__empty">No plugins found.</p>
          ) : (
            <div className="plugin-browser__grid">
              {filtered.map((plugin) => (
                <div key={plugin.id} className="plugin-card">
                  <div className="plugin-card__header">
                    <span className="plugin-card__name">{plugin.name}</span>
                    <span className={`plugin-card__badge plugin-card__badge--${plugin.type}`}>
                      {TYPE_LABELS[plugin.type] || plugin.type}
                    </span>
                  </div>
                  <p className="plugin-card__desc">{plugin.description}</p>
                  {plugin.tools && plugin.tools.length > 0 && (
                    <span className="plugin-card__tools">
                      {plugin.tools.length} tool{plugin.tools.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <div className="plugin-card__footer">
                    <label className="plugin-card__toggle">
                      <input
                        type="checkbox"
                        checked={plugin.enabled}
                        disabled={plugin.type === 'builtin'}
                        onChange={() => handleToggle(plugin)}
                      />
                      <span className="plugin-card__toggle-slider" />
                    </label>
                    <span className="plugin-card__status">
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
