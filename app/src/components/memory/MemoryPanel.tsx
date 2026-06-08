import { useCallback, useEffect, useRef, useState } from 'react'

const BACKEND = 'http://localhost:3001'

const TYPES = ['user', 'project', 'feedback', 'reference'] as const
type MemoryType = (typeof TYPES)[number]

interface Memory {
  id: number
  type: string
  name: string
  content: string
  created_at?: string
}

interface Props {
  onClose: () => void
}

/**
 * MemoryPanel — view, add and delete the agent's persistent memories.
 * These are injected into every conversation's system prompt ("Things I remember").
 */
export function MemoryPanel({ onClose }: Props) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [newType, setNewType] = useState<MemoryType>('user')
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`${BACKEND}/api/memories`)
      .then((r) => r.json())
      .then((d) => setMemories(d.memories || []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const addMemory = useCallback(async () => {
    const content = newContent.trim()
    if (!content) return
    await fetch(`${BACKEND}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type: newType, name: content.slice(0, 40) }),
    })
    setNewContent('')
    load()
  }, [newContent, newType, load])

  const removeMemory = useCallback(
    async (id: number) => {
      await fetch(`${BACKEND}/api/memories/${id}`, { method: 'DELETE' })
      load()
    },
    [load],
  )

  return (
    <div className="plugin-browser-overlay">
      <div className="plugin-browser" ref={panelRef}>
        <div className="plugin-browser__header">
          <h2 className="plugin-browser__title">Mémoire de l'agent</h2>
          <button className="plugin-browser__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="plugin-browser__add-form">
          <select
            className="plugin-browser__add-input"
            value={newType}
            onChange={(e) => setNewType(e.target.value as MemoryType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="plugin-browser__add-input plugin-browser__add-input--wide"
            placeholder="Un fait que l'agent doit retenir entre les sessions…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addMemory()
            }}
          />
          <button type="button" className="plugin-browser__add-confirm" onClick={addMemory}>
            Ajouter
          </button>
        </div>

        <div className="plugin-browser__body">
          {loading ? (
            <p className="plugin-browser__empty">Chargement…</p>
          ) : memories.length === 0 ? (
            <p className="plugin-browser__empty">
              Aucune mémoire. Ajoute un fait que l'agent doit retenir (qui tu es, tes
              préférences, le contexte de tes projets…).
            </p>
          ) : (
            <div className="plugin-browser__grid">
              {memories.map((m) => (
                <div key={m.id} className="plugin-card">
                  <div className="plugin-card__header">
                    <span className="plugin-card__badge plugin-card__badge--skill">{m.type}</span>
                    <button
                      type="button"
                      className="memory-card__delete"
                      onClick={() => removeMemory(m.id)}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="plugin-card__desc">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
