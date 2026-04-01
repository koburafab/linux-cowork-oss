import { useEffect, useRef, memo, useMemo } from 'react'
import { useChatStore } from '../../stores/chatStore'

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/```([\s\S]*?)```/)
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <pre key={i} className="msg-code-block">
          <code>{blocks[i].replace(/^\w*\n/, '')}</code>
        </pre>,
      )
    } else {
      const lines = blocks[i].split('\n')
      const lineNodes: React.ReactNode[] = []

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j]
        if (/^\s*[-*]\s/.test(line)) {
          lineNodes.push(
            <div key={`${i}-${j}`} className="msg-list-item">
              {renderInline(line.replace(/^\s*[-*]\s/, ''))}
            </div>,
          )
        } else {
          if (j > 0) lineNodes.push(<br key={`br-${i}-${j}`} />)
          lineNodes.push(
            <span key={`${i}-${j}`}>{renderInline(line)}</span>,
          )
        }
      }

      nodes.push(<span key={`block-${i}`}>{lineNodes}</span>)
    }
  }

  return nodes
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="msg-inline-code">
          {match[3]}
        </code>,
      )
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

/** Single message — memoized to avoid re-rendering old messages */
const MessageItem = memo(function MessageItem({
  role,
  content,
  timestamp,
  model,
}: {
  role: string
  content: string
  timestamp: number
  model?: string
}) {
  const rendered = useMemo(
    () => renderMarkdown(content),
    [content],
  )

  return (
    <div className={`message message--${role}`}>
      <div className="message__header">
        <span className="message__role">
          {role === 'user' ? 'You' : model || 'Assistant'}
        </span>
        <span className="message__time">{formatTimestamp(timestamp)}</span>
      </div>
      <div className="message__content">{rendered}</div>
    </div>
  )
})

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty">
        <p className="message-list__placeholder">
          Envoie un message pour commencer.
        </p>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <MessageItem
          key={`msg-${i}`}
          role={msg.role}
          content={typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
          timestamp={msg.timestamp}
          model={msg.model}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
