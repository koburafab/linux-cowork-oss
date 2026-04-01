/**
 * ConversationList — sidebar listing past conversations
 */

import { useEffect, useState } from 'react'
import { getConversations, getConversationMessages } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'

interface ConversationItem {
  id: number
  title: string
  model: string
  created_at: string
}

export function ConversationList() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const loadConversation = useChatStore((s) => s.loadConversation)
  const clearMessages = useChatStore((s) => s.clearMessages)

  const fetchConversations = async () => {
    try {
      const data = await getConversations()
      setConversations(data.conversations || [])
    } catch {
      // backend not ready
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const handleSelect = async (conv: ConversationItem) => {
    setActiveConversation(conv.id)
    try {
      const data = await getConversationMessages(conv.id)
      const messages = (data.messages || []).map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: m.timestamp,
      }))
      loadConversation(messages)
    } catch {
      // failed to load
    }
  }

  const handleNew = () => {
    setActiveConversation(null)
    clearMessages()
  }

  const truncate = (text: string, len: number) =>
    text.length > len ? `${text.slice(0, len)}...` : text

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Conversations</span>
        <button type="button" className="sidebar__new-btn" onClick={handleNew}>
          +
        </button>
      </div>
      <div className="sidebar__list">
        {conversations.length === 0 && (
          <div className="sidebar__empty">No conversations yet</div>
        )}
        {conversations.map((conv) => (
          <button
            type="button"
            key={conv.id}
            className={`sidebar__item ${activeConversationId === conv.id ? 'sidebar__item--active' : ''}`}
            onClick={() => handleSelect(conv)}
          >
            <span className="sidebar__item-title">
              {truncate(conv.title, 40)}
            </span>
            <span className="sidebar__item-date">
              {new Date(conv.created_at).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
