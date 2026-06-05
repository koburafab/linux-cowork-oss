import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { SendIcon, BotIcon, MicIcon, PaperclipIcon } from '../icons/Icons'
import { transcribeVoice } from '../../api/client'

interface ChatInputProps {
  onSend: (message: string, agentMode: boolean) => void
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState('')
  const [agentMode, setAgentMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isStreaming = useChatStore((s) => s.isStreaming)

  // Record the mic and drop the transcription into the input box.
  const handleMic = useCallback(async () => {
    if (isRecording || isStreaming) return
    setIsRecording(true)
    try {
      const transcript = await transcribeVoice(5)
      if (transcript) {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
        textareaRef.current?.focus()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setText((prev) => `${prev}\n[micro: ${msg}]`)
    } finally {
      setIsRecording(false)
    }
  }, [isRecording, isStreaming])

  // Read an attached text file and insert its content into the message.
  const handleFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      setText((prev) =>
        `${prev ? prev + '\n\n' : ''}--- ${file.name} ---\n${content}`,
      )
      textareaRef.current?.focus()
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

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
      <button
        type="button"
        className={`chat-input__icon-btn${isRecording ? ' chat-input__icon-btn--recording' : ''}`}
        onClick={handleMic}
        disabled={isStreaming || isRecording}
        title={isRecording ? 'Enregistrement… (5s)' : 'Parler (micro)'}
      >
        <MicIcon size={18} />
      </button>
      <button
        type="button"
        className="chat-input__icon-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={isStreaming}
        title="Joindre un document texte"
      >
        <PaperclipIcon size={18} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.log,.ctp,.php,.js,.ts,.html,.css,.xml,.yml,.yaml"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
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
