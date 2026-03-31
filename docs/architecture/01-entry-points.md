# Entry Points, State Management & Query Engine

## 1. Entry Point: main.tsx

### Sequence de Demarrage
```
1. Profiling + feature gating
2. Trust dialog (premier lancement)
3. Settings loading (user → project → local → managed → CLI)
4. Shell snapshot creation (capture env)
5. Sandbox initialization (config bwrap)
6. MCP server setup (computer use, external)
7. Hook registration (session, skill, frontmatter)
8. UI bootstrap (React/Ink)
9. Query engine ready
```

### Feature Gating
- Compile-time: flags dans le bundle Bun
- Runtime: checks de features
- GrowthBook: A/B testing et rollout progressif

## 2. State Management

### Pattern
Custom store (style Zustand) avec AppState central.

### AppState contient
- Session info (id, mode, permissions)
- Conversation messages
- Tool states
- Computer use state (apps, locks, displays)
- Task list
- Hook registry
- Settings cache

### Data Flow
```
User Input → processUserInput → Query Engine
    ↓
API Call (Claude) → Response Stream
    ↓
Tool Calls → Permission Check → Execute → Results
    ↓
AppState Update → React Re-render
```

## 3. Query Engine

### Boucle Principale
```
1. Compile context (git status, claude.md, memories)
2. Build messages (system + conversation history)
3. API call (streaming)
4. Parse response (text + tool calls)
5. Execute tools (with permissions)
6. Append results to conversation
7. Loop if tool results need follow-up
8. Stop when assistant response is complete
```

### Message Compilation
- Git status injection
- CLAUDE.md discovery (recursive up)
- Memoire contextuelle
- Memoization pour performance

### Compaction
- Quand contexte approche limites → compression messages anciens
- Preserve instructions systeme
- Garde les messages recents intacts

## 4. Tool System (40+ outils)

### Categories
```
File Operations: Read, Write, Edit, Glob, Grep
Shell: Bash, PowerShell
Search: WebSearch, WebFetch
MCP: mcp__* (protocole extensible)
Tasks: TaskCreate, TaskUpdate, TaskGet, TaskList
Teams: Agent (spawn sub-agents), SendMessage
Planning: EnterPlanMode, ExitPlanMode
Computer Use: mcp__computer-use__* (screenshot, click, type)
Notebook: NotebookEdit
```

### Execution Flow
```
Tool Call from API
    ↓
Permission Check (deny/allow/ask)
    ↓
PreToolUse hooks
    ↓
Tool Execute
    ↓
PostToolUse / PostToolUseFailure hooks
    ↓
Result → back to conversation
```

## 5. Components (33+ directories)

### Principaux
- VirtualMessageList: affichage conversation virtualise
- Spinner: indicateurs de chargement
- Diff: affichage differences fichiers
- OAuth: flux d'authentification
- Agents: wizard de creation d'agents

## 6. Commands (100+, 88 sous-directories)

Slash commands accessibles via `/command`. Chaque commande est un module independant avec:
- Description
- Handler function
- Optional completions
- Optional permission requirements

## Points Cles pour Linux Cowork

1. **Le startup sequence est complexe** — simplifier pour le MVP
2. **Le state management custom est bon** — Zustand fait pareil en plus simple
3. **La query loop est le coeur** — c'est la boucle conversation qu'on doit reproduire
4. **40+ tools est over-kill pour MVP** — commencer avec 10 essentiels
5. **La compaction est critique** — gerer les limites de contexte des le debut
