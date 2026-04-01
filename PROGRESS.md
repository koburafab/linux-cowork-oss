# PROGRESS.md — Linux Cowork OSS

> Ce fichier est la source de verite pour l'avancement du projet.
> Toute nouvelle session Claude Code DOIT lire ce fichier en premier.

## Etat Actuel: PHASE 4 — POLISH

**Derniere mise a jour**: 2026-04-02 02:00
**Derniere session**: Phases 0-3 completees. 162 tests passent.

## Checklist Globale

### Phase 0 — Setup (DONE)
- [x] Documentation architecture Claude Code (13 docs)
- [x] Market research (pain points, features demandees)
- [x] PROJECT.md (vision, stack, plan)
- [x] Installer outils systeme (xdotool, scrot, bwrap, wmctrl, Tauri deps)
- [x] Init projet Tauri + React + Vite + Bun
- [x] Config Vitest (tests)
- [x] Premier build qui compile

### Phase 1 — Core Engine (DONE)
- [x] Multi-model router (Claude API + Ollama + OpenAI-compatible)
- [x] Chat UI basique (input + messages + streaming)
- [x] Query loop (conversation engine)
- [x] File access securise (read/write/edit)
- [x] Memoire persistante SQLite (bun:sqlite)
- [x] Audit trail (log actions)
- [x] Settings system (JSON hot-reload)
- [ ] Permission system basique (allow/deny)
- [x] Tests unitaires core (62 tests)

### Phase 2 — Computer Use (DONE)
- [x] Screenshot capture module (scrot/grim)
- [x] Mouse control module (xdotool/ydotool)
- [x] Keyboard control module (xdotool/ydotool)
- [x] Window management module (wmctrl)
- [x] Vision model integration (Anthropic + Ollama image support)
- [x] Computer Use MCP server (7 outils exposes)
- [x] Lock system (file-based, O_EXCL, stale recovery)
- [x] Permission system (deny/allow/ask, 3 modes, glob matching)
- [x] Audit trail standalone (SQLite + file log)
- [x] Tests computer use integration (20 tests)

### Phase 3 — Agent System (DONE)
- [x] MCP client (connect, listTools, callTool)
- [x] Skills/plugins (frontmatter YAML, hot-reload, .md/.json)
- [x] Hooks system (7 events, serial exec, blocking)
- [x] Task management (SQLite CRUD, async runTask)
- [x] Sub-agent spawning (in-process, isolated conversations)
- [x] Tests agents (45 tests)

### Phase 4 — Polish (EN COURS)
- [ ] Wayland support complet (ydotool + grim tests)
- [ ] Undo/rollback file operations
- [ ] Packaging (.deb, .AppImage)
- [ ] Build Tauri complet (desktop app qui se lance)
- [ ] Integration end-to-end (UI → engine → model → response)

## Comment Reprendre

```bash
# 1. Lire l'etat du projet
cat ~/Documents/linux-cowork-oss/PROGRESS.md

# 2. Lire le PROJECT.md pour le contexte
cat ~/Documents/linux-cowork-oss/PROJECT.md

# 3. Verifier l'etat du code
cd ~/Documents/linux-cowork-oss && git log --oneline -10

# 4. Lancer les tests
cd ~/Documents/linux-cowork-oss/app && bun test

# 5. Continuer la prochaine tache non-cochee ci-dessus
```

## Regles pour les Sessions Autonomes

1. **TOUJOURS lire PROGRESS.md en premier** — c'est la source de verite
2. **Mettre a jour PROGRESS.md apres chaque tache completee** — cocher la case
3. **Committer regulierement** — petits commits atomiques
4. **Tester avant de passer a la suite** — `bun test` doit passer
5. **Si bloque**: documenter le probleme dans PROGRESS.md et passer a la tache suivante
6. **Screenshots**: sauver dans `tests/screenshots/` pour verification
7. **Ne JAMAIS casser ce qui marche** — tester avant et apres chaque changement
