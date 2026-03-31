# Tech Stack Recommande — Linux Cowork OSS

## Runtime & Build

| Composant | Choix | Raison |
|-----------|-------|--------|
| Runtime | **Bun** | Rapide, TypeScript natif, compatible Node |
| Framework UI | **Tauri v2** | Natif Linux, leger (~5MB), Rust backend |
| Frontend | **React + Vite** | Ecosysteme riche, hot reload |
| State | **Zustand** | Simple, performant, pattern similaire a Claude Code |
| Base de donnees | **SQLite** (via better-sqlite3) | Local-first, zero config |

## Computer Use (Linux)

| Composant | Choix | Raison |
|-----------|-------|--------|
| Screenshot X11 | **scrot** | Simple, rapide, CLI |
| Screenshot Wayland | **grim + slurp** | Standard Wayland |
| Mouse/Keyboard X11 | **xdotool** | Mature, bien documente |
| Mouse/Keyboard Wayland | **ydotool** | Equivalent Wayland |
| Window Management | **wmctrl** | Controle fenetres X11 |
| Image Processing | **sharp** (Node) | Resize/compress rapide |
| OCR (optionnel) | **tesseract** | OCR local open-source |

## IA & Models

| Composant | Choix | Raison |
|-----------|-------|--------|
| Multi-model router | **Custom** (inspiré OpenRouter) | Flexibilite totale |
| Claude API | **@anthropic-ai/sdk** | Officiel |
| OpenAI-compatible | **openai SDK** | Pour Ollama, Grok, etc. |
| Local inference | **Ollama** | Deja installe sur S23 |
| Vision model | **Claude 4.5 Sonnet** ou **Gemini Flash** | Bon ratio cout/qualite pour screenshots |

## Communication & Protocol

| Composant | Choix | Raison |
|-----------|-------|--------|
| Agent protocol | **MCP** (Model Context Protocol) | Standard, compatible Claude Code |
| Inter-agent | **File-based mailbox** | Simple, debuggable, pattern Claude Code |
| HTTP | **Hono** | Ultra-leger, compatible Bun |
| WebSocket | **ws** ou Bun native | Pour real-time UI updates |

## Securite

| Composant | Choix | Raison |
|-----------|-------|--------|
| Sandbox | **bubblewrap (bwrap)** | Natif Linux, utilise par Claude Code |
| Alternative sandbox | **firejail** | Plus simple, bon pour MVP |
| Permissions | **Custom** (inspire Claude Code) | Simplifie pour notre cas |

## Dev & CI

| Composant | Choix | Raison |
|-----------|-------|--------|
| Test runner | **Vitest** | Rapide, compatible Vite |
| Linting | **Biome** | Rapide, remplace ESLint + Prettier |
| Build | **Vite + Tauri CLI** | Build desktop natif |
| Package manager | **bun** | Lock file deterministe |

## Structure Projet Proposee

```
linux-cowork-oss/
├── src/
│   ├── main.ts              # Entry point Tauri
│   ├── app/                 # Frontend React
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React hooks
│   │   ├── stores/          # Zustand stores
│   │   └── pages/           # Routes/pages
│   ├── core/                # Backend logic
│   │   ├── agent/           # Agent orchestration
│   │   ├── computer-use/    # Screenshot, mouse, keyboard
│   │   ├── mcp/             # MCP client/server
│   │   ├── hooks/           # Event system
│   │   ├── skills/          # Plugin system
│   │   ├── task/            # Task management
│   │   └── models/          # Multi-model router
│   ├── utils/               # Shared utilities
│   └── types/               # TypeScript types
├── src-tauri/               # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/        # Tauri commands (IPC)
│   │   └── computer_use/    # Native computer use (Rust)
│   └── Cargo.toml
├── tests/                   # Tests
├── docs/                    # Documentation
├── package.json
├── tauri.conf.json
└── vite.config.ts
```

## Dependances Cles

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@modelcontextprotocol/sdk": "latest",
    "react": "^19",
    "zustand": "^5",
    "hono": "^4",
    "sharp": "^0.33",
    "better-sqlite3": "^11",
    "chokidar": "^4"
  },
  "devDependencies": {
    "@biomejs/biome": "latest",
    "vitest": "^3",
    "vite": "^6",
    "@tauri-apps/cli": "^2"
  }
}
```
