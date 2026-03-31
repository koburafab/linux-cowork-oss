# Architecture Overview — Claude Code Source Analysis

> Analyse complete du code source de Claude Code (1902 fichiers TypeScript/TSX)

## Stack Technique

- **Runtime**: Bun (avec fallbacks Node.js)
- **UI**: React (Ink pour terminal, composants custom)
- **State**: Custom store pattern (Zustand-like) avec AppState
- **API**: Claude API via SDK Anthropic
- **Tools**: 40+ outils built-in (file ops, shell, search, MCP, tasks, teams)
- **Commands**: 100+ slash commands (88 sous-repertoires)
- **Native**: Rust (enigo pour input) + Swift (screenshots, app management)

## Architecture Haut Niveau

```
┌─────────────────────────────────────────────────┐
│                    main.tsx                       │
│         (Entry point, profiling, bootstrap)       │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  State    │  │  Query   │  │  Components   │  │
│  │  Store    │  │  Engine  │  │  (React/Ink)  │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │                │           │
│  ┌────┴──────────────┴────────────────┴───────┐  │
│  │              Tool System (40+)              │  │
│  ├─────────┬──────────┬───────────┬───────────┤  │
│  │ File    │ Shell    │ Search   │ MCP       │  │
│  │ Ops     │ (Bash/PS)│ (Grep)  │ Protocol  │  │
│  └─────────┴──────────┴───────────┴───────────┘  │
│                                                   │
│  ┌─────────┬──────────┬───────────┬───────────┐  │
│  │ Swarm   │Computer  │ Ultraplan│ Hooks     │  │
│  │ (Agents)│ Use      │ (Plans) │ System    │  │
│  └─────────┴──────────┴───────────┴───────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │         Security Layer                       │  │
│  │  Sandbox │ Permissions │ Bash Parser        │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Modules Cles

| Module | Fichiers | Role |
|--------|----------|------|
| `computerUse/` | 15 | Controle desktop (screenshot, souris, clavier) |
| `swarm/` | 21 | Orchestration multi-agents |
| `ultraplan/` | ~10 | Planification et decomposition de taches |
| `mcp/` | ~5 | Client Model Context Protocol |
| `skills/` | ~3 | Systeme de plugins/skills |
| `memory/` | ~3 | Memoire persistante |
| `task/` | ~6 | Gestion du cycle de vie des taches |
| `hooks/` | ~15 | Extensibilite event-driven |
| `sandbox/` | 2 | Sandboxing OS-level (bwrap) |
| `permissions/` | ~12 | Controle d'acces multi-couches |
| `bash/` | ~8 | Parser bash pure-TS + analyse securite |
| `shell/` | ~7 | Abstraction shell (bash/powershell) |
| `settings/` | ~10 | Configuration multi-sources |

## Startup Sequence

```
1. main.tsx → profiling + feature gating
2. Trust dialog (first run)
3. Settings loading (user → project → local → managed → CLI)
4. Shell snapshot creation (env capture)
5. Sandbox initialization (bwrap config)
6. MCP server setup (computer use, external)
7. Hook registration (session, skill, frontmatter)
8. UI bootstrap (React/Ink)
9. Query engine ready
```

## Points d'Integration pour Linux Cowork

### Ce qu'on peut reutiliser directement
- Architecture MCP (protocol standard)
- Systeme de hooks (event-driven, extensible)
- Pattern de state management
- Task lifecycle management
- Systeme de skills/plugins

### Ce qu'on doit adapter
- Computer Use (macOS-only → Linux via xdotool/xdg)
- Native modules (Swift → remplacer par solutions Linux)
- Sandbox (bwrap existe deja sur Linux)
- Shell provider (bash only, pas besoin PowerShell)

### Ce qu'on doit creer
- UI desktop (Tauri ou Electron)
- Multi-model support (Claude + Gemini + Grok + Ollama)
- Integration Trismegis (12 agents existants)
- Fractal Engine connector
