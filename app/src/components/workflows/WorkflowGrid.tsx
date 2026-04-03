import { useEffect, useState } from 'react'
import { getWorkflows, type Workflow } from '../../api/client'
import { WORKFLOW_ICON_MAP, FolderIcon } from '../icons/Icons'

const WORKFLOW_COLORS: Record<string, string> = {
  folder: '#3b82f6',       // blue
  'heart-pulse': '#ef4444', // red
  camera: '#8b5cf6',       // purple
  search: '#f59e0b',       // amber
  'git-branch': '#10b981', // green
  calendar: '#ec4899',     // pink
}

interface WorkflowGridProps {
  onSelect: (prompt: string, useTools: boolean) => void
}

export function WorkflowGrid({ onSelect }: WorkflowGridProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])

  useEffect(() => {
    getWorkflows()
      .then((data) => setWorkflows(data.workflows))
      .catch(() => {
        // silently fail — grid just stays empty
      })
  }, [])

  if (workflows.length === 0) return null

  return (
    <div className="workflow-grid">
      {workflows.map((wf) => (
        <button
          key={wf.id}
          className="workflow-card"
          onClick={() => onSelect(wf.prompt, wf.mode !== 'chat')}
        >
          <span className="workflow-card__icon" style={{ color: WORKFLOW_COLORS[wf.icon] || '#888' }}>
            {(() => { const Icon = WORKFLOW_ICON_MAP[wf.icon] ?? FolderIcon; return <Icon size={28} /> })()}
          </span>
          <span className="workflow-card__name">{wf.name}</span>
          <span className="workflow-card__desc">{wf.description}</span>
        </button>
      ))}
    </div>
  )
}
