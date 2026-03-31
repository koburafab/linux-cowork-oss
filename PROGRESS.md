# PROGRESS.md — Linux Cowork OSS

> Ce fichier est la source de verite pour l'avancement du projet.
> Toute nouvelle session Claude Code DOIT lire ce fichier en premier.

## Etat Actuel: PHASE 0 — SETUP

**Derniere mise a jour**: 2026-04-01 23:00
**Derniere session**: Documentation complete + market research

## Checklist Globale

### Phase 0 — Setup (EN COURS)
- [x] Documentation architecture Claude Code (13 docs)
- [x] Market research (pain points, features demandees)
- [x] PROJECT.md (vision, stack, plan)
- [ ] Installer outils systeme (xdotool, scrot, bwrap, wmctrl, Tauri deps)
- [ ] Init projet Tauri + React + Vite + Bun
- [ ] Config Biome (linting)
- [ ] Config Vitest (tests)
- [ ] Premier build qui compile

### Phase 1 — Core Engine (TODO)
- [ ] Multi-model router (Claude API + Ollama + OpenAI-compatible)
- [ ] Chat UI basique (input + messages + streaming)
- [ ] Query loop (conversation engine)
- [ ] File access securise (read/write/edit)
- [ ] Memoire persistante SQLite
- [ ] Audit trail (log actions)
- [ ] Settings system (JSON hot-reload)
- [ ] Permission system basique (allow/deny)
- [ ] Tests unitaires core

### Phase 2 — Computer Use (TODO)
- [ ] Screenshot capture (scrot/grim)
- [ ] Vision model integration
- [ ] Mouse control (xdotool)
- [ ] Keyboard control (xdotool)
- [ ] Window management (wmctrl)
- [ ] Lock system (file-based)
- [ ] Tests computer use

### Phase 3 — Agent System (TODO)
- [ ] MCP client
- [ ] Skills/plugins
- [ ] Hooks system
- [ ] Task management
- [ ] Sub-agent spawning
- [ ] Tests agents

## Comment Reprendre

```bash
# 1. Lire l'etat du projet
cat ~/Documents/linux-cowork-oss/PROGRESS.md

# 2. Lire le PROJECT.md pour le contexte
cat ~/Documents/linux-cowork-oss/PROJECT.md

# 3. Verifier l'etat du code
cd ~/Documents/linux-cowork-oss && git log --oneline -10 2>/dev/null

# 4. Verifier si le build passe
cd ~/Documents/linux-cowork-oss && npm run build 2>/dev/null || bun run build 2>/dev/null

# 5. Lancer les tests
cd ~/Documents/linux-cowork-oss && npm test 2>/dev/null || bun test 2>/dev/null

# 6. Continuer la prochaine tache non-cochee ci-dessus
```

## Regles pour les Sessions Autonomes

1. **TOUJOURS lire PROGRESS.md en premier** — c'est la source de verite
2. **Mettre a jour PROGRESS.md apres chaque tache completee** — cocher la case
3. **Committer regulierement** — petits commits atomiques
4. **Tester avant de passer a la suite** — `bun test` doit passer
5. **Si bloque**: documenter le probleme dans PROGRESS.md et passer a la tache suivante
6. **Screenshots**: sauver dans `tests/screenshots/` pour verification
7. **Ne JAMAIS casser ce qui marche** — tester avant et apres chaque changement
