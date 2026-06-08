import { useCallback, useEffect, useState, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { detectFirstArtifact } from '../../utils/artifacts'
import { streamChat, waitForBackend } from '../../api/client'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'
import { AuditPanel } from './AuditPanel'
import { TokenCounter } from './TokenCounter'
import { SettingsPanel } from '../settings/SettingsPanel'
import { PluginBrowser } from '../plugins/PluginBrowser'
import { MemoryPanel } from '../memory/MemoryPanel'
import { TemplatesPanel } from '../templates/TemplatesPanel'
import { WorkflowGrid } from '../workflows/WorkflowGrid'
import { SettingsIcon, PuzzleIcon, BotIcon, FolderIcon } from '../icons/Icons'

/** Throttle: update the store at most every N ms during streaming */
const RENDER_THROTTLE_MS = 150

export function ChatWindow() {
  const [showSettings, setShowSettings] = useState(false)
  const [showPlugins, setShowPlugins] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const addMessage = useChatStore((s) => s.addMessage)
  const activeModel = useChatStore((s) => s.activeModel)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const addAuditEntry = useChatStore((s) => s.addAuditEntry)
  const addAgentAction = useChatStore((s) => s.addAgentAction)
  const setCurrentScreenshot = useChatStore((s) => s.setCurrentScreenshot)
  const setArtifact = useChatStore((s) => s.setArtifact)
  const messages = useChatStore((s) => s.messages)
  const backendReady = useChatStore((s) => s.backendReady)
  const setBackendReady = useChatStore((s) => s.setBackendReady)

  const lastRenderRef = useRef(0)
  const pendingUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    waitForBackend().then((ready) => setBackendReady(ready))
  }, [setBackendReady])

  /** Update the last assistant message content, throttled */
  const flushContent = useCallback((content: string) => {
    useChatStore.setState((state) => {
      const msgs = state.messages.slice()
      const lastIdx = msgs.length - 1
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content }
      }
      return { messages: msgs }
    })
    lastRenderRef.current = Date.now()
  }, [])

  const throttledUpdate = useCallback((content: string) => {
    const now = Date.now()
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current)
    }
    if (now - lastRenderRef.current >= RENDER_THROTTLE_MS) {
      flushContent(content)
    } else {
      pendingUpdateRef.current = setTimeout(() => {
        flushContent(content)
        pendingUpdateRef.current = null
      }, RENDER_THROTTLE_MS)
    }
  }, [flushContent])

  const handleSend = useCallback(
    async (text: string, agentMode = false) => {
      addMessage({ role: 'user', content: text, timestamp: Date.now() })
      addAuditEntry('send', `User${agentMode ? ' [Agent]' : ''}: ${text.slice(0, 80)}`)

      addMessage({
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: activeModel.name,
      })

      setStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        let fullContent = ''

        for await (const event of streamChat(text, {
          useTools: agentMode,
          model: activeModel.id,
          signal: controller.signal,
        })) {
          switch (event.type) {
            case 'text':
              fullContent += event.content
              throttledUpdate(fullContent)
              break

            case 'tool_call':
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'tool_call',
                name: event.name,
                input: event.input,
                timestamp: Date.now(),
              })
              break

            case 'tool_result':
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'tool_result',
                name: event.name,
                result: event.result,
                timestamp: Date.now(),
              })
              break

            case 'screenshot':
              setCurrentScreenshot(event.base64, Date.now())
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'screenshot',
                timestamp: Date.now(),
              })
              break

            case 'error':
              fullContent += `\nError: ${event.content}`
              flushContent(fullContent)
              break

            case 'done':
              break
          }
        }

        // Final flush to make sure we have the complete content
        flushContent(fullContent)
        addAuditEntry('response', `${activeModel.name}: ${fullContent.slice(0, 80)}`)

        // Auto-detect artifacts in completed response
        const artifact = detectFirstArtifact(fullContent)
        if (artifact) {
          setArtifact(artifact)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          addAuditEntry('send', 'Génération arrêtée')
        } else {
          const errMsg = err instanceof Error ? err.message : String(err)
          flushContent(`Erreur: ${errMsg}`)
          addAuditEntry('error', errMsg)
        }
      } finally {
        if (pendingUpdateRef.current) {
          clearTimeout(pendingUpdateRef.current)
          pendingUpdateRef.current = null
        }
        setStreaming(false)
        abortRef.current = null
      }
    },
    [activeModel, addMessage, setStreaming, addAuditEntry, addAgentAction, setCurrentScreenshot, setArtifact, throttledUpdate, flushContent],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  if (!backendReady) {
    return (
      <div className="chat-window">
        <div className="chat-window__header">
          <h1 className="chat-window__title">Linux Cowork</h1>
        </div>
        <div className="message-list message-list--empty">
          <p className="message-list__placeholder">Backend starting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <h1 className="chat-window__title">Linux Cowork</h1>
        <div className="chat-window__header-controls">
          <ModelSelector />
          <button
            className="chat-window__plugins-btn"
            onClick={() => setShowMemory((v) => !v)}
            title="Mémoire de l'agent"
          >
            <BotIcon size={18} />
          </button>
          <button
            className="chat-window__plugins-btn"
            onClick={() => setShowTemplates((v) => !v)}
            title="Modèles de courrier"
          >
            <FolderIcon size={18} />
          </button>
          <button
            className="chat-window__plugins-btn"
            onClick={() => setShowPlugins((v) => !v)}
            title="Plugins"
          >
            <PuzzleIcon size={18} />
          </button>
          <button
            className="chat-window__settings-btn"
            onClick={() => setShowSettings((v) => !v)}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>
      {messages.length === 0 ? (
        <WorkflowGrid onSelect={(prompt, useTools) => handleSend(prompt, useTools)} />
      ) : (
        <MessageList />
      )}
      <ChatInput onSend={handleSend} onStop={handleStop} />
      <div className="chat-window__footer">
        <TokenCounter />
        <AuditPanel />
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showPlugins && <PluginBrowser onClose={() => setShowPlugins(false)} />}
      {showMemory && <MemoryPanel onClose={() => setShowMemory(false)} />}
      {showTemplates && <TemplatesPanel onClose={() => setShowTemplates(false)} />}
    </div>
  )
}
