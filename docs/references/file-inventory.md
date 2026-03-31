# File Inventory — Claude Code Source

> 1902 fichiers analyses depuis ~/Documents/claude-code-src/

## Structure Top-Level

```
src/
├── state/              # State management (AppState, stores)
├── remote/             # Remote session management (WebSocket CCR)
├── voice/              # Voice input (feature-gated)
├── utils/              # Modules utilitaires (le gros du code)
│   ├── teleport/       # Teleportation de sessions
│   ├── claudeInChrome/ # Extension Chrome
│   ├── messages/       # Gestion messages
│   ├── processUserInput/ # Traitement input utilisateur
│   ├── nativeInstaller/  # Installeur natif
│   ├── sandbox/        # ★ Sandboxing (bwrap adapter)
│   ├── deepLink/       # Deep links
│   ├── suggestions/    # Suggestions auto
│   ├── swarm/          # ★ Multi-agents orchestration
│   ├── ultraplan/      # ★ Planification de taches
│   ├── github/         # Integration GitHub
│   ├── git/            # Operations git
│   ├── filePersistence/# Persistance fichiers
│   ├── plugins/        # Systeme plugins
│   ├── computerUse/    # ★ Computer Use (screenshot, mouse, keyboard)
│   ├── memory/         # ★ Memoire persistante
│   ├── skills/         # ★ Systeme de skills
│   ├── mcp/            # ★ Client MCP
│   ├── task/           # ★ Gestion taches
│   ├── background/     # Execution background
│   ├── secureStorage/  # Stockage securise
│   ├── shell/          # ★ Shell execution (bash/powershell)
│   ├── settings/       # ★ Configuration multi-sources
│   ├── permissions/    # ★ Permissions multi-couches
│   ├── hooks/          # ★ Systeme de hooks event-driven
│   ├── model/          # Selection/routing modeles
│   ├── todo/           # Todo list
│   ├── telemetry/      # Telemetrie
│   ├── bash/           # ★ Parser bash pure-TS
│   ├── dxt/            # Extensions
│   └── powershell/     # PowerShell specific
├── moreright/          # Module "more right" (unknown)
├── components/         # Composants React UI
│   ├── diff/           # Affichage diff
│   └── agents/         # UI agents (wizard creation)
└── types/              # Types TypeScript
    └── generated/      # Types generes (events, telemetrie)
```

## Stats

| Categorie | Fichiers |
|-----------|----------|
| Total | 1902 |
| Modules documentes (★) | ~120 |
| Composants React | ~200+ |
| Types/generated | ~100+ |
| Commands (slash) | ~88 directories |
| Tests | inclus dans modules |

## Modules Cles (★) — Documentes dans /docs/modules/

| Module | Doc | Fichiers | Lignes principales |
|--------|-----|----------|-------------------|
| computerUse | computer-use.md | 15 | executor.ts, wrapper.tsx |
| swarm | swarm.md | 21 | teamHelpers.ts, inProcessRunner.ts |
| ultraplan | ultraplan.md | ~10 | ExitPlanModeScanner, poll loop |
| mcp | mcp-skills-memory.md | ~5 | dateTimeParser, validation |
| skills | mcp-skills-memory.md | ~3 | skillChangeDetector |
| memory | mcp-skills-memory.md | ~3 | types.ts, versions.ts |
| task | mcp-skills-memory.md | ~6 | framework.ts, TaskOutput.ts |
| hooks | mcp-skills-memory.md | ~15 | 14+ event types, 5 exec modes |
| sandbox | sandbox-permissions.md | 2 | sandbox-adapter.ts |
| permissions | sandbox-permissions.md | ~12 | permissions.ts (52K), filesystem.ts (62K) |
| shell | sandbox-permissions.md | ~7 | bashProvider.ts, readOnlyValidation |
| bash | sandbox-permissions.md | ~8 | bashParser.ts (130K), ast.ts (112K) |
| settings | sandbox-permissions.md | ~10 | settings.ts (32K), types.ts (42K) |
