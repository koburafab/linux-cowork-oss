import { useState } from 'react'
import { useChatStore } from '../../stores/chatStore'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function AuditPanel() {
  const [visible, setVisible] = useState(false)
  const auditLog = useChatStore((s) => s.auditLog)

  return (
    <div className="audit-panel">
      <button
        className="audit-panel__toggle"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Masquer audit' : `Audit (${auditLog.length})`}
      </button>
      {visible && (
        <div className="audit-panel__list">
          {auditLog.length === 0 ? (
            <p className="audit-panel__empty">Aucune action.</p>
          ) : (
            auditLog.map((entry, i) => (
              <div key={`${entry.timestamp}-${i}`} className="audit-panel__entry">
                <span className="audit-panel__time">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="audit-panel__action">{entry.action}</span>
                <span className="audit-panel__details">{entry.details}</span>
                {entry.model && (
                  <span className="audit-panel__model">[{entry.model}]</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
