# PROGRESS.md — Linux Cowork OSS

> Source de verite. Lire en premier a chaque session.

## Etat: SPRINT 2 QUASI COMPLET

**Derniere mise a jour**: 2026-04-04
**Stats**: 364 tests, 0 fail, 48 commits, ~9000 lignes source

## Tout ce qui est FAIT

### Core
- [x] Multi-model router (DeepSeek, Kimi K2.5, Claude, Ollama)
- [x] Tool-use loop (19 tools, OpenAI + Anthropic format)
- [x] Backend Hono sidecar auto-start (0.0.0.0:3001)
- [x] SQLite persistent (conversations, messages, memories, audit)
- [x] API optimizations (prefix caching DeepSeek 95%, Kimi 75%)
- [x] MCP bridge (tools MCP branches dans le tool-use loop)
- [x] Token counter + cost tracking par model

### Computer Use
- [x] gnome-screenshot (32KB optimise)
- [x] xdotool (mouse, keyboard, windows)
- [x] Kimi K2.5 vision (voit l'ecran, decrit le desktop)
- [x] Mode autonome (POST /api/autonomous)
- [x] Vision loop (screenshots auto 2s)

### UI
- [x] Chat dark theme + streaming SSE
- [x] Agent Mode toggle
- [x] Sidebar conversations (delete, rename, new)
- [x] Settings panel (API keys masquees)
- [x] Plugin browser (19+ tools/skills)
- [x] Agent panel collapsible + spawn agents
- [x] Workflow cards (6 presets colores)
- [x] Artifacts (HTML/SVG/Mermaid preview live)
- [x] Typing indicator (3 dots animation)
- [x] Copy message button
- [x] Consistent SVG icons (19 icones)
- [x] Undo button + file history
- [x] Notifications desktop

### Securite
- [x] API keys masquees dans GET /api/settings
- [x] CORS restreint (plus origin: *)
- [x] Command injection fix (xdg-open URL validation)
- [x] Permissions (deny/allow/ask)
- [x] Audit trail

### Infra
- [x] .deb package
- [x] Remote LAN access
- [x] MIT License + disclaimer
- [x] README GitHub pret
- [x] MCP servers config (YouTube, filesystem)
- [x] Ollama local (llama3.2:1b)

### Docs
- [x] Model optimizations reference
- [x] Top 27 MCP servers reference
- [x] Architecture documentation

## Sprint 2 — Reste a faire
- [ ] Voice input (Whisper)
- [ ] Connexion Trismegis (bridge Hub M900)
- [ ] Publish GitHub
