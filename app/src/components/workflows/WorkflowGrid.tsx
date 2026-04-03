import { useEffect, useState } from 'react'
import { getWorkflows, type Workflow } from '../../api/client'
import { WORKFLOW_ICON_MAP, FolderIcon } from '../icons/Icons'

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
          <span className="workflow-card__icon">
            {(() => { const Icon = WORKFLOW_ICON_MAP[wf.icon] ?? FolderIcon; return <Icon size={24} /> })()}
          </span>
          <span className="workflow-card__name">{wf.name}</span>
          <span className="workflow-card__desc">{wf.description}</span>
        </button>
      ))}
    </div>
  )
}
