import { useEffect, useRef } from 'react'
import { useChatStore } from '../../stores/chatStore'

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Basic markdown: **bold**, `inline code`, ```code blocks```, and lists (- item)
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/```([\s\S]*?)```/)
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      // Code block
      nodes.push(
        <pre key={i} className="msg-code-block">
          <code>{blocks[i].replace(/^\w*\n/, '')}</code>
        </pre>,
      )
    } else {
      // Regular text with inline formatting
      const lines = blocks[i].split('\n')
      const lineNodes: React.ReactNode[] = []

      for (let j = 0; j < lines.length; j++) {
        const line = lines[j]

        // List items
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
  // Match **bold** and `code`
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

export function MessageList() {
  const messages = useChatStore((s) => s.messages)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        <div
          key={`${msg.timestamp}-${i}`}
          className={`message message--${msg.role}`}
        >
          <div className="message__header">
            <span className="message__role">
              {msg.role === 'user' ? 'You' : msg.model || 'Assistant'}
            </span>
            <span className="message__time">
              {formatTimestamp(msg.timestamp)}
            </span>
          </div>
          <div className="message__content">
            {renderMarkdown(msg.content)}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
