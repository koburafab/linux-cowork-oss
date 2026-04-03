import { useState, useRef, useCallback, type KeyboardEvent } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { SendIcon, BotIcon } from '../icons/Icons'

interface ChatInputProps {
  onSend: (message: string, agentMode: boolean) => void
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('')
  const [agentMode, setAgentMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = useChatStore((s) => s.isStreaming)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed, agentMode)
    setText('')
    // Reset height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, isStreaming, onSend, agentMode])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="chat-input">
      <label className="agent-toggle" title="Agent Mode — active les outils">
        <input
          type="checkbox"
          className="agent-toggle__checkbox"
          checked={agentMode}
          onChange={(e) => setAgentMode(e.target.checked)}
          disabled={isStreaming}
        />
        <span className="agent-toggle__slider" />
        <span className="agent-toggle__label"><BotIcon size={14} /></span>
      </label>
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          autoResize()
        }}
        onKeyDown={handleKeyDown}
        placeholder={isStreaming ? 'En attente...' : agentMode ? 'Agent mode — tools enabled...' : 'Message...'}
        disabled={isStreaming}
        rows={1}
      />
      <button
        className="chat-input__send"
        onClick={handleSend}
        disabled={isStreaming || !text.trim()}
        title="Envoyer (Enter)"
      >
        {isStreaming ? '...' : <SendIcon size={18} />}
      </button>
    </div>
  )
}
