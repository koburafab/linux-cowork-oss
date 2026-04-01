import { useCallback, useEffect } from 'react'
import { useChatStore } from '../../stores/chatStore'
import { streamChat, waitForBackend } from '../../api/client'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'
import { AuditPanel } from './AuditPanel'

export function ChatWindow() {
  const addMessage = useChatStore((s) => s.addMessage)
  const activeModel = useChatStore((s) => s.activeModel)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const addAuditEntry = useChatStore((s) => s.addAuditEntry)
  const addAgentAction = useChatStore((s) => s.addAgentAction)
  const setCurrentScreenshot = useChatStore((s) => s.setCurrentScreenshot)
  const backendReady = useChatStore((s) => s.backendReady)
  const setBackendReady = useChatStore((s) => s.setBackendReady)

  // Check backend readiness on mount
  useEffect(() => {
    waitForBackend().then((ready) => setBackendReady(ready))
  }, [setBackendReady])

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
        let fullContent = ''

        for await (const event of streamChat(text)) {
          switch (event.type) {
            case 'text':
              fullContent += event.content
              useChatStore.setState((state) => {
                const msgs = [...state.messages]
                const lastIdx = msgs.length - 1
                if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                  msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent }
                }
                return { messages: msgs }
              })
              break

            case 'tool_call':
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'tool_call',
                name: event.name,
                input: event.input,
                timestamp: Date.now(),
              })
              addAuditEntry('tool_call', event.name)
              break

            case 'tool_result':
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'tool_result',
                name: event.name,
                result: event.result,
                timestamp: Date.now(),
              })
              addAuditEntry('tool_result', `${event.name}: ${event.result.slice(0, 80)}`)
              break

            case 'screenshot':
              setCurrentScreenshot(event.base64)
              addAgentAction({
                id: crypto.randomUUID(),
                type: 'screenshot',
                timestamp: Date.now(),
              })
              addAuditEntry('screenshot', 'Screenshot captured')
              break

            case 'error':
              fullContent += `\nError: ${event.content}`
              addAuditEntry('error', event.content)
              useChatStore.setState((state) => {
                const msgs = [...state.messages]
                const lastIdx = msgs.length - 1
                if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                  msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent }
                }
                return { messages: msgs }
              })
              break

            case 'done':
              break
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
    [activeModel, addMessage, setStreaming, addAuditEntry, addAgentAction, setCurrentScreenshot],
  )

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
        <ModelSelector />
      </div>
      <MessageList />
      <ChatInput onSend={handleSend} />
      <AuditPanel />
    </div>
  )
}
