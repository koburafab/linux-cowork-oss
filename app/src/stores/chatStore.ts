/**
 * Chat store — main conversation state
 */

import { create } from 'zustand'
import type { ChatMessage, ModelConfig } from '../core/models/types'
import { DEFAULT_MODELS } from '../core/models/types'

interface AuditEntry {
  timestamp: number
  action: string
  details: string
  model?: string
}

interface ChatState {
  messages: ChatMessage[]
  activeModel: ModelConfig
  availableModels: ModelConfig[]
  isStreaming: boolean
  auditLog: AuditEntry[]

  // Actions
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  setActiveModel: (model: ModelConfig) => void
  setStreaming: (streaming: boolean) => void
  addAuditEntry: (action: string, details: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeModel: DEFAULT_MODELS[0],
  availableModels: DEFAULT_MODELS,
  isStreaming: false,
  auditLog: [],

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  clearMessages: () => set({ messages: [] }),

  setActiveModel: (model) => set({ activeModel: model }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  addAuditEntry: (action, details) =>
    set((state) => ({
      auditLog: [
        ...state.auditLog,
        {
          timestamp: Date.now(),
          action,
          details,
          model: state.activeModel.name,
        },
      ],
    })),
}))
