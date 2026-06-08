/**
 * AgentPanel — side panel showing agent actions, screenshots, undo, and stop control
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { ChevronLeftIcon, ChevronRightIcon, SettingsIcon, CameraIcon, UndoIcon } from '../icons/Icons'
import { ArtifactViewer } from './ArtifactViewer'
import { ScreenshotViewer } from './ScreenshotViewer'
import { undoFile, listAgents, spawnAgent, killAgent } from '../../api/client'
import type { AgentInfo } from '../../api/client'

/** Tools that modify files and support undo */
const FILE_MODIFYING_TOOLS = new Set(['write_file', 'edit_file'])

export function AgentPanel() {
  const [collapsed, setCollapsed] = useState(true)
  const [undoStates, setUndoStates] = useState<Record<string, 'idle' | 'undone'>>({})
  const [screenshotPulse, setScreenshotPulse] = useState(false)
  const lastScreenshotTs = useRef<number>(0)
  const [liveAgents, setLiveAgents] = useState<AgentInfo[]>([])
  const [showSpawnDialog, setShowSpawnDialog] = useState(false)
  const [spawnName, setSpawnName] = useState('')
  const [spawnTask, setSpawnTask] = useState('')
  const agentActions = useChatStore((s) => s.agentActions)
  const currentScreenshot = useChatStore((s) => s.currentScreenshot)
  const screenshotTimestamp = useChatStore((s) => s.screenshotTimestamp)
  const isAutonomous = useChatStore((s) => s.isAutonomous)
  const setAutonomous = useChatStore((s) => s.setAutonomous)
  const activeModel = useChatStore((s) => s.activeModel)
  const clearAgentActions = useChatStore((s) => s.clearAgentActions)

  // Pulse animation when a new screenshot arrives
  useEffect(() => {
    const ts = screenshotTimestamp ?? 0
    if (ts > lastScreenshotTs.current) {
      lastScreenshotTs.current = ts
      setScreenshotPulse(true)
      const timer = setTimeout(() => setScreenshotPulse(false), 600)
      return () => clearTimeout(timer)
    }
  }, [screenshotTimestamp])

  // Poll active agents every 5 seconds
  const fetchAgents = useCallback(async () => {
    try {
      const data = await listAgents()
      setLiveAgents(data.agents ?? [])
    } catch {
      // Backend not available — keep stale data
    }
  }, [])

  useEffect(() => {
    fetchAgents()
    const timer = setInterval(fetchAgents, 5000)
    return () => clearInterval(timer)
  }, [fetchAgents])

  async function handleSpawn() {
    if (!spawnName.trim() || !spawnTask.trim()) return
    try {
      await spawnAgent({ name: spawnName.trim(), task: spawnTask.trim(), model: activeModel.id })
      setSpawnName('')
      setSpawnTask('')
      setShowSpawnDialog(false)
      fetchAgents()
    } catch {
      // Silently fail
    }
  }

  async function handleKill(id: string) {
    try {
      await killAgent(id)
      fetchAgents()
    } catch {
      // Silently fail
    }
  }

  async function handleUndo(actionId: string, filePath: string) {
    setUndoStates((prev) => ({ ...prev, [actionId]: 'idle' }))
    try {
      await undoFile(filePath)
      setUndoStates((prev) => ({ ...prev, [actionId]: 'undone' }))
    } catch {
      // Silently fail — button stays visible for retry
    }
  }

  if (collapsed) {
    return (
      <div className="agent-panel agent-panel--collapsed" onClick={() => setCollapsed(false)}>
        <span className="agent-panel__collapsed-label">AGENT</span>
        <span className="agent-panel__collapsed-arrow"><ChevronLeftIcon size={16} /></span>
      </div>
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
            className="agent-panel__collapse-btn"
            onClick={() => setCollapsed(true)}
            title="Collapse panel"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <ArtifactViewer />

      {currentScreenshot && (
        <div className={`agent-panel__screenshot-wrapper${screenshotPulse ? ' agent-panel__screenshot--pulse' : ''}`}>
          <ScreenshotViewer base64={currentScreenshot} timestamp={screenshotTimestamp ?? Date.now()} />
        </div>
      )}

      {/* Multi-agent section */}
      <div className="agent-panel__multi">
        <div className="agent-panel__multi-header">
          <h3 className="agent-panel__subtitle">Agents</h3>
          <button
            className="agent-panel__spawn-btn"
            onClick={() => setShowSpawnDialog((v) => !v)}
          >
            Spawn Agent
          </button>
        </div>

        {showSpawnDialog && (
          <div className="agent-panel__spawn-dialog">
            <input
              className="agent-panel__spawn-input"
              type="text"
              placeholder="Agent name"
              value={spawnName}
              onChange={(e) => setSpawnName(e.target.value)}
            />
            <input
              className="agent-panel__spawn-input"
              type="text"
              placeholder="Task"
              value={spawnTask}
              onChange={(e) => setSpawnTask(e.target.value)}
            />
            <button className="agent-panel__spawn-confirm" onClick={handleSpawn}>
              Go
            </button>
          </div>
        )}

        {liveAgents.length === 0 && (
          <p className="agent-panel__empty">No active agents.</p>
        )}
        {liveAgents.map((a) => (
          <div key={a.id} className="agent-panel__agent-row">
            <span className="agent-panel__agent-name">{a.name}</span>
            <span className={`agent-panel__agent-status agent-panel__agent-status--${a.status}`}>
              {a.status}
            </span>
            <button
              className="agent-panel__kill-btn"
              onClick={() => handleKill(a.id)}
            >
              Kill
            </button>
          </div>
        ))}
      </div>

      <div className="agent-panel__actions">
        {agentActions.length === 0 && (
          <p className="agent-panel__empty">No agent actions yet.</p>
        )}
        {agentActions.map((action) => (
          <div key={action.id} className={`agent-action agent-action--${action.type}`}>
            <span className="agent-action__icon">
              {action.type === 'tool_call' && <SettingsIcon size={14} />}
              {action.type === 'tool_result' && '\u2713'}
              {action.type === 'screenshot' && <CameraIcon size={14} />}
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
              {action.type === 'tool_result' && action.name && FILE_MODIFYING_TOOLS.has(action.name) && (() => {
                // Find the matching tool_call to get the file path
                const matchingCall = agentActions.find(
                  (a) => a.type === 'tool_call' && a.name === action.name && a.timestamp <= action.timestamp && a.input?.path,
                )
                const filePath = (matchingCall?.input?.path ?? action.input?.path) as string | undefined
                if (!filePath) return null
                return (
                  <span className="agent-action__undo">
                    {undoStates[action.id] === 'undone' ? (
                      <span className="agent-action__undo-done">Undone!</span>
                    ) : (
                      <button
                        className="agent-action__undo-btn"
                        onClick={() => handleUndo(action.id, filePath)}
                      >
                        Undo
                      </button>
                    )}
                  </span>
                )
              })()}
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
