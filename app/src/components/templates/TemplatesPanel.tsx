import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlugins, type Plugin } from '../../api/client'

const BACKEND = 'http://localhost:3001'

interface Props {
  onClose: () => void
}

/**
 * TemplatesPanel — create and manage reusable "canvases" (courrier templates).
 * Stored as skills, so the agent follows them to produce consistent letters/documents.
 */
export function TemplatesPanel({ onClose }: Props) {
  const [skills, setSkills] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    getPlugins()
      .then((d) => setSkills((d.plugins || []).filter((p) => p.type === 'skill')))
      .catch(() => setSkills([]))
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

  const save = useCallback(async () => {
    setError('')
    if (!name.trim() || !prompt.trim()) {
      setError('Le nom et le contenu du canevas sont requis')
      return
    }
    try {
      const res = await fetch(`${BACKEND}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), prompt }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || `Erreur ${res.status}`)
        return
      }
      setName('')
      setDescription('')
      setPrompt('')
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [name, description, prompt, load])

  const remove = useCallback(
    async (skillName: string) => {
      await fetch(`${BACKEND}/api/skills/${encodeURIComponent(skillName)}`, { method: 'DELETE' })
      load()
    },
    [load],
  )

  return (
    <div className="plugin-browser-overlay">
      <div className="plugin-browser" ref={panelRef}>
        <div className="plugin-browser__header">
          <h2 className="plugin-browser__title">Modèles de courrier</h2>
          <button
            type="button"
            className="plugin-browser__add"
            onClick={() => setShowForm((v) => !v)}
            title="Nouveau canevas"
          >
            + Nouveau modèle
          </button>
          <button className="plugin-browser__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {showForm && (
          <div className="plugin-browser__add-form">
            <input
              className="plugin-browser__add-input"
              placeholder="Nom (ex: Lettre SGTT)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="plugin-browser__add-input plugin-browser__add-input--wide"
              placeholder="Description courte"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <textarea
              className="plugin-browser__add-input plugin-browser__add-input--wide template-textarea"
              placeholder={
                'Le canevas que l’agent suivra. Ex:\n\nTu rédiges un courrier officiel SGTT Transport.\nEn-tête: SGTT Transport, [adresse], [logo].\nFormat: lieu et date, objet, formule de politesse, corps, signature.\nTon: professionnel, concis, en français.'
              }
              rows={8}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {error && <span className="plugin-browser__add-error">{error}</span>}
            <button type="button" className="plugin-browser__add-confirm" onClick={save}>
              Enregistrer le modèle
            </button>
          </div>
        )}

        <div className="plugin-browser__body">
          {loading ? (
            <p className="plugin-browser__empty">Chargement…</p>
          ) : skills.length === 0 ? (
            <p className="plugin-browser__empty">
              Aucun modèle. Crée un canevas de courrier réutilisable (en-tête, format, ton) — l’agent
              le suivra pour produire des lettres constantes.
            </p>
          ) : (
            <div className="plugin-browser__grid">
              {skills.map((s) => (
                <div key={s.id} className="plugin-card">
                  <div className="plugin-card__header">
                    <span className="plugin-card__name">{s.name}</span>
                    <button
                      type="button"
                      className="memory-card__delete"
                      onClick={() => remove(s.name)}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="plugin-card__desc">{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
