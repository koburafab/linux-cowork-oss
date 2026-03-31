# Data Flow — Conversation Loop & Tool Execution

## Flux Principal

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────→│  Query   │────→│  Claude  │
│  Input   │     │  Engine  │     │  API     │
└──────────┘     └────┬─────┘     └────┬─────┘
                      │                │
                      │  ┌─────────────┘
                      │  │ Response (streaming)
                      │  ↓
                 ┌────┴──────┐
                 │  Parser   │
                 │ (text +   │
                 │ tool calls)│
                 └────┬──────┘
                      │
            ┌─────────┴─────────┐
            │                   │
       ┌────┴────┐        ┌────┴────┐
       │  Text   │        │  Tool   │
       │ Output  │        │  Call   │
       └─────────┘        └────┬────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
               ┌────┴─────┐        ┌─────┴────┐
               │Permission│        │ PreTool  │
               │  Check   │        │  Hook    │
               └────┬─────┘        └──────────┘
                    │
              ┌─────┴─────┐
              │  Execute  │
              │   Tool    │
              └─────┬─────┘
                    │
              ┌─────┴─────┐
              │ PostTool  │
              │   Hook    │
              └─────┬─────┘
                    │
              ┌─────┴─────┐
              │  Result   │──→ Back to conversation
              └───────────┘    (loop si besoin)
```

## Tool Execution Detail

### Permission Pipeline
```
1. Load rules (all sources, by priority)
2. Check deny rules first (deny wins)
3. Check allow rules
4. If auto mode: classifier side-query
5. If still undecided: prompt user
6. Execute or block
```

### File Operation Flow
```
Read/Write/Edit request
    ↓
Path resolution (absolute, symlink follow)
    ↓
Dangerous file check (.gitconfig, .bashrc, etc.)
    ↓
Dangerous directory check (.git, .claude, etc.)
    ↓
Sandbox check (bwrap allowWrite/denyWrite)
    ↓
Permission mode check (default/plan/auto/etc.)
    ↓
Execute
```

### Bash Command Flow
```
Command string
    ↓
Heredoc extraction (prevent quote mangling)
    ↓
AST parsing (pure-TS parser, 50ms timeout)
    ↓
Security analysis (fail-closed on unknown nodes)
    ↓
If 'simple': check against read-only allowlist
If 'too-complex': full permission prompt
    ↓
Shell provider (bash snapshot + sandbox)
    ↓
Execute with CWD tracking
    ↓
Output capture (file mode or pipe mode)
    ↓
Result (truncated if > 32KB)
```

## Multi-Agent Flow (Swarm)

```
Leader receives complex task
    ↓
Decompose into sub-tasks (ultraplan)
    ↓
Spawn sub-agents (in-process or pane)
    ↓
Each agent works independently
    │
    ├── Agent 1: file research
    ├── Agent 2: code generation
    └── Agent 3: testing
    │
    ↓
Communication via mailbox (file-based)
    ↓
Permission sync (agent → leader → response)
    ↓
Results aggregated by leader
    ↓
Final response to user
```

## Computer Use Flow

```
User request: "Open Firefox and search for X"
    ↓
Lock acquisition (file-based, O_EXCL)
    ↓
Escape hotkey registration
    ↓
Permission dialog (approved apps + flags)
    ↓
Screenshot capture (current state)
    ↓
Vision model analysis (what's on screen)
    ↓
Action planning (click here, type there)
    ↓
Execute: mouse move + click + keyboard
    ↓
Screenshot again (verify result)
    ↓
Loop until task complete
    ↓
Cleanup: unhide apps, release lock
```

## State Persistence

```
Session State:
  AppState (in-memory) ──→ React UI

Persistent State:
  Settings (JSON files) ──→ Hot reload on change
  Memory (MEMORY.md + files) ──→ Loaded at startup
  Tasks (file-based) ──→ Polling 1000ms

Inter-Session:
  SQLite (for our impl) ──→ Survives restart
  Skills (watched dirs) ──→ Hot reload
```
