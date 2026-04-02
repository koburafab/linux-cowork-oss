# PROGRESS.md — Linux Cowork OSS

> Ce fichier est la source de verite pour l'avancement du projet.
> Toute nouvelle session Claude Code DOIT lire ce fichier en premier.

## Etat Actuel: SPRINT 1 P3

**Derniere mise a jour**: 2026-04-02 02:17
**Derniere session**: Sprint 1 P1+P2 completes. 280 tests, 18 tools, remote LAN, memory, sidebar.
**Fab absent**: jusqu'au 4 avril. Dev autonome.

## MVP + Sprint 1 P1-P2 (DONE)
- [x] Multi-model router (DeepSeek default, Kimi, Claude, Ollama)
- [x] Chat UI (dark theme, streaming, model selector, settings gear)
- [x] Computer Use (gnome-screenshot, xdotool, 18 tools)
- [x] Tool-use loop (OpenAI + Anthropic format, max 25 iter)
- [x] Mode autonome (POST /api/autonomous)
- [x] Backend Hono sidecar auto-start (0.0.0.0:3001)
- [x] Agent Mode toggle (switch dans ChatInput)
- [x] Historique conversations (SQLite, save/load)
- [x] Sidebar conversations (ConversationList, click-to-load)
- [x] Agent memory (save_memory + recall_memories tools)
- [x] Remote access LAN (mobile HTML page sur /)
- [x] Notifications desktop (notify-send)
- [x] Fix binaire (mainBinaryName: linux-cowork)
- [x] Settings UI (API keys, model, temperature)
- [x] Permissions + hooks + skills + tasks + orchestrator
- [x] .deb package
- [x] 280 tests, 0 fail

## Sprint 1 P3 — Polish (EN COURS)

- [x] **Undo visible dans l'UI** — bouton "Annuler" apres chaque action agent
- [x] **Vision continue** — POST /api/autonomous/vision-loop (screenshots every 2s)
- [ ] **Multi-agents E2E** — connecter l'orchestrator a l'UI
- [ ] **Rebuild .deb** avec toutes les features
- [x] **Test E2E complet** — 4/5 workflows PASS, screenshots dans /screenshots/

## Sprint 2 (a venir)
- [ ] Workflows templates
- [ ] Plugin marketplace UI
- [ ] Voice input (whisper)
- [ ] Connexion Trismegis (bridge Hub M900)
- [ ] Publish GitHub

## Comment Reprendre

```bash
cat ~/Documents/linux-cowork-oss/PROGRESS.md
cd ~/Documents/linux-cowork-oss/app && bun test
cd ~/Documents/linux-cowork-oss/app && bun run build
cd ~/Documents/linux-cowork-oss/app && bun run src/backend/server.ts
curl -s http://localhost:3001/health
```

## Regles Sessions Autonomes
1. Lire PROGRESS.md en premier
2. Cocher les taches completes
3. Committer apres chaque tache
4. bun test + bun run build doivent passer
5. Tester en vrai (curl + screenshot)
6. Ne JAMAIS casser ce qui marche
