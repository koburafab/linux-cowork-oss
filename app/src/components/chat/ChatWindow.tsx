import { useCallback } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { modelRouter } from '../../core/models'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'
import { AuditPanel } from './AuditPanel'

export function ChatWindow() {
  const addMessage = useChatStore((s) => s.addMessage)
  const activeModel = useChatStore((s) => s.activeModel)
  const messages = useChatStore((s) => s.messages)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const addAuditEntry = useChatStore((s) => s.addAuditEntry)

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg = {
        role: 'user' as const,
        content: text,
        timestamp: Date.now(),
      }
      addMessage(userMsg)
      addAuditEntry('send', `User: ${text.slice(0, 80)}`)

      // Add empty assistant placeholder for streaming
      addMessage({
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: activeModel.name,
      })

      setStreaming(true)

      try {
        const allMessages = [...messages, userMsg]
        let fullContent = ''

        for await (const chunk of modelRouter.stream(activeModel, allMessages)) {
          if (chunk.type === 'text') {
            fullContent += chunk.content
            useChatStore.setState((state) => {
              const msgs = [...state.messages]
              const lastIdx = msgs.length - 1
              if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent }
              }
              return { messages: msgs }
            })
          } else if (chunk.type === 'error') {
            fullContent = `Erreur: ${chunk.content}`
            addAuditEntry('error', chunk.content)
            useChatStore.setState((state) => {
              const msgs = [...state.messages]
              const lastIdx = msgs.length - 1
              if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent }
              }
              return { messages: msgs }
            })
          }
        }

        addAuditEntry('response', `${activeModel.name}: ${fullContent.slice(0, 80)}`)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        useChatStore.setState((state) => {
          const msgs = [...state.messages]
          const lastIdx = msgs.length - 1
          if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
            msgs[lastIdx] = { ...msgs[lastIdx], content: `Erreur: ${errMsg}` }
          }
          return { messages: msgs }
        })
        addAuditEntry('error', errMsg)
      } finally {
        setStreaming(false)
      }
    },
    [activeModel, messages, addMessage, setStreaming, addAuditEntry],
  )

  return (
    <div className="chat-window">
      <div className="chat-window__header">
        <h1 className="chat-window__title">Linux Cowork</h1>
        <ModelSelector />
      </div>
      <MessageList />
      <ChatInput onSend={handleSend} />
      <AuditPanel />
    </div>
  )
}
