import { useEffect, useRef, memo, useMemo, useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { extractArtifactBlocks, blockToArtifact } from '../../utils/artifacts'

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Artifact-eligible language tags */
const ARTIFACT_LANGS = new Set(['html', 'svg', 'mermaid'])

function renderMarkdown(
  text: string,
  onPreview?: (lang: string, code: string) => void,
): React.ReactNode[] {
  const blocks = text.split(/```([\s\S]*?)```/)
  const nodes: React.ReactNode[] = []

  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      // Extract optional language tag from the first line
      const langMatch = blocks[i].match(/^(\w+)\n/)
      const lang = langMatch ? langMatch[1].toLowerCase() : ''
      const code = langMatch ? blocks[i].slice(langMatch[0].length) : blocks[i]
      const isArtifact = ARTIFACT_LANGS.has(lang)

      nodes.push(
        <div key={i} className="msg-code-block-wrapper">
          <pre className="msg-code-block">
            <code>{code}</code>
          </pre>
          {isArtifact && onPreview && (
            <button
              className="msg-code-block__preview-btn"
              onClick={() => onPreview(lang, code)}
            >
              Preview
            </button>
          )}
        </div>,
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
  const setArtifact = useChatStore((s) => s.setArtifact)

  const handlePreview = useCallback(
    (lang: string, code: string) => {
      const blocks = extractArtifactBlocks(`\`\`\`${lang}\n${code}\n\`\`\``)
      if (blocks.length > 0) {
        setArtifact(blockToArtifact(blocks[0]))
      }
    },
    [setArtifact],
  )

  const rendered = useMemo(
    () => renderMarkdown(content, role === 'assistant' ? handlePreview : undefined),
    [content, role, handlePreview],
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
