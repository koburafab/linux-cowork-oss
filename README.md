# Linux Cowork OSS

Open-source Cowork alternative for Linux — multi-agent desktop AI assistant.

## Vision

A Linux-native, open-source, multi-model alternative to Claude Cowork with:
- **Computer Use** (xdotool + screenshot + vision model)
- **Multi-agent orchestration** (sub-agents paralleles)
- **Multi-model** (Claude, Gemini, Grok, Ollama local)
- **Task scheduling** (cron-based mission runner)
- **MCP connectors** (extensible protocol)
- **Skills/plugins system**

## Architecture Reference

This project includes a complete reverse-engineering documentation of Claude Code's architecture (1902 source files analyzed). See `docs/` for details.

## Docs Structure

```
docs/
  architecture/
    00-overview.md           — Vue d'ensemble de l'architecture
    01-entry-points.md       — Points d'entree, state management, query engine
    02-data-flow.md          — Flux de donnees conversation + tool execution
  modules/
    computer-use.md          — Computer Use (screenshot, vision, mouse/keyboard)
    swarm.md                 — Orchestration multi-agents (sub-agents)
    ultraplan.md             — Systeme de planification de taches
    mcp-skills-memory.md     — MCP client, skills, memoire, tasks, hooks
    sandbox-permissions.md   — Sandbox, permissions, shell, bash parser, settings
  references/
    file-inventory.md        — Inventaire complet des 1902 fichiers
    feature-comparison.md    — Comparaison Cowork vs clones vs notre projet
    tech-stack.md            — Stack technique recommande
```

## Status

- [x] Reverse-engineering Claude Code source (1902 files)
- [x] Documentation complete des modules
- [ ] Architecture design de l'app
- [ ] MVP implementation

## License

TBD
