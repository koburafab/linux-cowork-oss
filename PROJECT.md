# PROJECT.md — Linux Cowork OSS

## Quoi ?

Un **Cowork open-source pour Linux** — assistant IA desktop qui peut voir ton ecran, cliquer, taper, gerer tes fichiers, et orchestrer des agents en parallele. Multi-model (Claude, Gemini, Grok, Ollama local). Gratuit.

## Pourquoi ?

1. **Anthropic ignore Linux** — zero support officiel malgre bariere technique triviale
2. **Cowork coute $200/mois** — et les users se plaignent de rate limits, amnésie, et fichiers supprimes
3. **Aucun clone ne fait computer use + multi-agents + local-first** — c'est notre differenciateur
4. **On a deja 80% des briques** — Hub Trismegis (160K lignes), 12 agents, Fractal Engine

## Pour qui ?

- Devs Linux frustres par l'absence de Cowork
- Power users qui veulent du local-first et privacy
- Equipes qui veulent du multi-model sans vendor lock-in
- La communaute open-source qui veut une alternative credible

## Top 10 Pain Points du Marche (recherche)

| # | Probleme | Notre Solution |
|---|----------|---------------|
| 1 | Suppression fichiers destructive (rm -rf) | Sandbox bwrap + undo/rollback |
| 2 | Rate limits qui drainent en 90min | BYOK + Ollama local = $0 |
| 3 | Zero memoire entre sessions | SQLite + MEMORY.md persistant |
| 4 | Prompt injection → exfiltration fichiers | Sandbox + audit trail |
| 5 | Claude only, vendor lock-in | Multi-model router |
| 6 | Pas de Linux | LINUX-FIRST |
| 7 | Donnees envoyees au cloud | 100% local possible |
| 8 | Pas d'audit trail | Log detaille chaque action |
| 9 | Taches s'arretent si laptop dort | Background execution |
| 10 | $200/mois pour du beta | Open-source gratuit |

## Architecture

```
┌─────────────────────────────────────────┐
│           Tauri Desktop App              │
│  ┌─────────────────────────────────┐    │
│  │     React UI (Vite + Zustand)   │    │
│  └──────────────┬──────────────────┘    │
│                 │ IPC                    │
│  ┌──────────────┴──────────────────┐    │
│  │         Core Engine (Bun)        │    │
│  │                                  │    │
│  │  ┌──────────┐ ┌──────────────┐  │    │
│  │  │ Query    │ │ Multi-Model  │  │    │
│  │  │ Loop     │ │ Router       │  │    │
│  │  └──────────┘ └──────────────┘  │    │
│  │                                  │    │
│  │  ┌──────────┐ ┌──────────────┐  │    │
│  │  │ Computer │ │ Agent        │  │    │
│  │  │ Use      │ │ Orchestrator │  │    │
│  │  └──────────┘ └──────────────┘  │    │
│  │                                  │    │
│  │  ┌──────────┐ ┌──────────────┐  │    │
│  │  │ MCP      │ │ Hooks +      │  │    │
│  │  │ Client   │ │ Skills       │  │    │
│  │  └──────────┘ └──────────────┘  │    │
│  │                                  │    │
│  │  ┌──────────────────────────┐   │    │
│  │  │ Security: bwrap sandbox  │   │    │
│  │  │ + permissions + audit    │   │    │
│  │  └──────────────────────────┘   │    │
│  └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Stack

- **Desktop**: Tauri v2 (Rust backend, 5MB)
- **Frontend**: React 19 + Vite + Zustand
- **Runtime**: Bun
- **DB**: SQLite (better-sqlite3)
- **IA**: @anthropic-ai/sdk + openai SDK (pour Ollama/Grok)
- **Computer Use**: xdotool + scrot (X11) / ydotool + grim (Wayland)
- **Sandbox**: bubblewrap (bwrap)
- **Protocol**: MCP (Model Context Protocol)
- **Tests**: Vitest
- **Lint**: Biome

## Plan MVP

### Phase 1 — Fondations (P0)
- [ ] Init projet Tauri + React + Vite
- [ ] UI chat basique (input + messages + streaming)
- [ ] Multi-model router (Claude API + Ollama)
- [ ] File access securise (read/write avec sandbox bwrap)
- [ ] Memoire persistante SQLite
- [ ] Audit trail (log de chaque action)
- [ ] Settings system (JSON, hot-reload)

### Phase 2 — Computer Use (P1)
- [ ] Screenshot capture (scrot/grim)
- [ ] Vision model integration (envoyer screenshot a Claude/Gemini)
- [ ] Mouse control (xdotool movemove/click)
- [ ] Keyboard control (xdotool key/type)
- [ ] Window management (wmctrl)
- [ ] File-based lock (prevent concurrent sessions)
- [ ] Permission dialog pour computer use

### Phase 3 — Agent System (P1)
- [ ] MCP client implementation
- [ ] Skills/plugins hot-reload
- [ ] Hooks system (14 event types)
- [ ] Task management (create, track, complete)
- [ ] Sub-agent spawning (in-process)
- [ ] Task scheduling (cron-based)

### Phase 4 — Polish (P2)
- [ ] Wayland support complet
- [ ] Undo/rollback pour file operations
- [ ] Team collaboration
- [ ] Templates/presets
- [ ] Packaging (.deb, .AppImage, AUR)

## Reference

Toute l'architecture est documentee dans `docs/` a partir du reverse-engineering de Claude Code (1902 fichiers source):
- `docs/architecture/` — Vue d'ensemble, entry points, data flow
- `docs/modules/` — Chaque module en detail (computer-use, swarm, ultraplan, etc.)
- `docs/references/` — Comparaison features, tech stack, inventaire fichiers

## Equipe

- **Fab** (AI Architect) — Direction, decisions
- **Claude Code / NUC** — Dev principal
- **Trismegis / M900** — Orchestration, agents, review
