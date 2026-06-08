/**
 * ConversationList — sidebar listing past conversations with delete/rename
 */

import { useEffect, useState, useCallback } from 'react'
import { getConversations, getConversationMessages } from '../../api/client'
import { useChatStore } from '../../stores/chatStore'
import { CloseIcon, PlusIcon } from '../icons/Icons'

const BACKEND = 'http://localhost:3001'

interface ConversationItem {
  id: number
  title: string
  model: string
  created_at: string
}

export function ConversationList() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const loadConversation = useChatStore((s) => s.loadConversation)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const availableModels = useChatStore((s) => s.availableModels)
  const setActiveModel = useChatStore((s) => s.setActiveModel)

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data.conversations || [])
    } catch {
      // backend not ready
    }
  }, [])

  // Load on mount, retrying a few times in case the backend is still
  // starting up (so the list never stays empty just because of a slow start).
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const tryLoad = async () => {
      try {
        const data = await getConversations()
        if (cancelled) return
        const list = data.conversations || []
        setConversations(list)
        if (list.length === 0 && attempts++ < 6) {
          setTimeout(tryLoad, 1000)
        }
      } catch {
        if (!cancelled && attempts++ < 6) setTimeout(tryLoad, 1000)
      }
    }
    tryLoad()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = async (conv: ConversationItem) => {
    setActiveConversation(conv.id)
    // Restore the model this conversation was created with
    const convModel = availableModels.find((m) => m.id === conv.model || m.name === conv.model)
    if (convModel) setActiveModel(convModel)
    try {
      const data = await getConversationMessages(conv.id)
      const messages = (data.messages || []).map((m: { role: string; content: string; timestamp: number }) => ({
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
    fetchConversations()
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    try {
      await fetch(`${BACKEND}/api/conversations/${id}`, { method: 'DELETE' })
      if (activeConversationId === id) {
        setActiveConversation(null)
        clearMessages()
      }
      fetchConversations()
    } catch {
      // ignore
    }
  }

  const handleDoubleClick = (conv: ConversationItem) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  const handleRename = async (id: number) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await fetch(`${BACKEND}/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })
      fetchConversations()
    } catch {
      // ignore
    }
    setEditingId(null)
  }

  const truncate = (text: string, len: number) =>
    text.length > len ? `${text.slice(0, len)}...` : text

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__title">Conversations</span>
        <button type="button" className="sidebar__new-btn" onClick={handleNew} title="Nouvelle conversation">
          <PlusIcon size={14} />
        </button>
      </div>
      <div className="sidebar__list">
        {conversations.length === 0 && (
          <div className="sidebar__empty">Aucune conversation</div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`sidebar__item ${activeConversationId === conv.id ? 'sidebar__item--active' : ''}`}
            onClick={() => handleSelect(conv)}
            onDoubleClick={() => handleDoubleClick(conv)}
            role="button"
            tabIndex={0}
          >
            {editingId === conv.id ? (
              <input
                className="sidebar__rename-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleRename(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(conv.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="sidebar__item-title">
                  {truncate(conv.title, 35)}
                </span>
                <span className="sidebar__item-date">
                  {new Date(conv.created_at).toLocaleDateString()}
                </span>
              </>
            )}
            <button
              type="button"
              className="sidebar__delete-btn"
              onClick={(e) => handleDelete(e, conv.id)}
              title="Supprimer la conversation"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
