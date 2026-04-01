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

export interface AgentAction {
  id: string
  type: 'tool_call' | 'tool_result' | 'screenshot'
  name?: string
  input?: Record<string, unknown>
  result?: string
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
  activeModel: ModelConfig
  availableModels: ModelConfig[]
  isStreaming: boolean
  auditLog: AuditEntry[]
  agentActions: AgentAction[]
  currentScreenshot: string | null
  isAutonomous: boolean
  backendReady: boolean
  activeConversationId: number | null

  // Actions
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  setActiveModel: (model: ModelConfig) => void
  setStreaming: (streaming: boolean) => void
  addAuditEntry: (action: string, details: string) => void
  addAgentAction: (action: AgentAction) => void
  setCurrentScreenshot: (base64: string | null) => void
  setAutonomous: (active: boolean) => void
  setBackendReady: (ready: boolean) => void
  clearAgentActions: () => void
  setActiveConversation: (id: number | null) => void
  loadConversation: (messages: ChatMessage[]) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeModel: DEFAULT_MODELS[0],
  availableModels: DEFAULT_MODELS,
  isStreaming: false,
  auditLog: [],
  agentActions: [],
  currentScreenshot: null,
  isAutonomous: false,
  backendReady: false,
  activeConversationId: null,

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

  addAgentAction: (action) =>
    set((state) => ({
      agentActions: [...state.agentActions, action],
    })),

  setCurrentScreenshot: (base64) => set({ currentScreenshot: base64 }),

  setAutonomous: (active) => set({ isAutonomous: active }),

  setBackendReady: (ready) => set({ backendReady: ready }),

  clearAgentActions: () => set({ agentActions: [], currentScreenshot: null }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  loadConversation: (messages) => set({ messages }),
}))
