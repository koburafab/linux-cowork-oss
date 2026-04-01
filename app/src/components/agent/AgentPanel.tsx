/**
 * AgentPanel — side panel showing agent actions, screenshots, and stop control
 */

import { useState } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { ScreenshotViewer } from './ScreenshotViewer'

export function AgentPanel() {
  const [visible, setVisible] = useState(true)
  const agentActions = useChatStore((s) => s.agentActions)
  const currentScreenshot = useChatStore((s) => s.currentScreenshot)
  const isAutonomous = useChatStore((s) => s.isAutonomous)
  const setAutonomous = useChatStore((s) => s.setAutonomous)
  const clearAgentActions = useChatStore((s) => s.clearAgentActions)

  if (!visible) {
    return (
      <button className="agent-panel__show-btn" onClick={() => setVisible(true)}>
        Agent
      </button>
    )
  }

  return (
    <div className="agent-panel">
      <div className="agent-panel__header">
        <h2 className="agent-panel__title">Agent</h2>
        <div className="agent-panel__controls">
          {isAutonomous && (
            <button
              className="agent-panel__stop-btn"
              onClick={() => setAutonomous(false)}
            >
              STOP
            </button>
          )}
          <button
            className="agent-panel__clear-btn"
            onClick={clearAgentActions}
          >
            Clear
          </button>
          <button
            className="agent-panel__hide-btn"
            onClick={() => setVisible(false)}
          >
            Hide
          </button>
        </div>
      </div>

      {currentScreenshot && (
        <ScreenshotViewer base64={currentScreenshot} timestamp={Date.now()} />
      )}

      <div className="agent-panel__actions">
        {agentActions.length === 0 && (
          <p className="agent-panel__empty">No agent actions yet.</p>
        )}
        {agentActions.map((action) => (
          <div key={action.id} className={`agent-action agent-action--${action.type}`}>
            <span className="agent-action__icon">
              {action.type === 'tool_call' && '\u2699'}
              {action.type === 'tool_result' && '\u2713'}
              {action.type === 'screenshot' && '\u{1F4F7}'}
            </span>
            <div className="agent-action__body">
              {action.name && <span className="agent-action__name">{action.name}</span>}
              {action.type === 'tool_call' && action.input && (
                <pre className="agent-action__detail">
                  {JSON.stringify(action.input, null, 2).slice(0, 200)}
                </pre>
              )}
              {action.type === 'tool_result' && action.result && (
                <pre className="agent-action__detail">
                  {action.result.slice(0, 300)}
                </pre>
              )}
            </div>
            <span className="agent-action__time">
              {new Date(action.timestamp).toLocaleTimeString('fr-CH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
