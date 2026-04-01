# PROGRESS.md — Linux Cowork OSS

> Ce fichier est la source de verite pour l'avancement du projet.
> Toute nouvelle session Claude Code DOIT lire ce fichier en premier.

## Etat Actuel: SPRINT 1 — APP UTILISABLE

**Derniere mise a jour**: 2026-04-02 11:00
**Derniere session**: MVP fonctionnel. DeepSeek chat + screenshot + 11 tools + backend auto-start.
**Fab absent**: 3 jours (2-4 avril). Dev autonome en cours.

## MVP Complete (Phases 0-4)
- [x] Documentation + market research (13 docs)
- [x] Projet Tauri + React + Vite + Bun
- [x] Multi-model router (DeepSeek, Kimi, Claude, Ollama)
- [x] Chat UI (dark theme, streaming, model selector, settings gear)
- [x] Query engine + file access + SQLite + settings + audit
- [x] Computer Use (gnome-screenshot, xdotool, wmctrl)
- [x] Tool-use loop (11 tools, OpenAI + Anthropic format)
- [x] Mode autonome (POST /api/autonomous)
- [x] Permissions + hooks + skills + task manager + agent orchestrator
- [x] Backend Hono sidecar auto-start
- [x] .deb package installe et fonctionnel
- [x] 257 tests, 0 fail

## Sprint 1 — App Utilisable (EN COURS)

### Priorite 1 (faire en premier)
- [ ] **Bouton Agent Mode dans l'UI** — toggle entre chat normal et mode autonome (avec tools). Ajouter un bouton/switch dans ChatWindow qui set `useTools: true` dans le POST /api/chat
- [ ] **Historique conversations** — sidebar avec les convos passees. Utiliser la DB SQLite existante (tables conversations + messages dans memory/db.ts). Ajouter un panel lateral gauche avec la liste des conversations.
- [ ] **Fix nom binaire** — `/usr/bin/app` → `/usr/bin/linux-cowork`. Changer dans tauri.conf.json: `"productName": "linux-cowork"` devrait suffir.

### Priorite 2 (ensuite)
- [ ] **Remote access LAN** — changer le backend pour ecouter sur 0.0.0.0:3001 (pas juste localhost). Fab veut piloter depuis son S23 Galaxy.
- [ ] **Notifications desktop** — quand l'agent finit une tache, notifier via `notify-send`.
- [ ] **Ollama local** — installer ollama sur le NUC, tester avec llama3.2.

### Priorite 3 (si le temps)
- [ ] **Undo visible dans l'UI** — bouton "Annuler" apres chaque action agent (FileHistoryManager existe deja)
- [ ] **Vision continue** — screenshot auto toutes les 2s pendant le mode autonome
- [ ] **Multi-agents E2E** — connecter l'orchestrator a l'UI

## Comment Reprendre

```bash
# 1. Lire l'etat du projet
cat ~/Documents/linux-cowork-oss/PROGRESS.md

# 2. Verifier les tests
cd ~/Documents/linux-cowork-oss/app && bun test

# 3. Verifier le build
cd ~/Documents/linux-cowork-oss/app && bun run build

# 4. Lancer le backend pour tester
cd ~/Documents/linux-cowork-oss/app && bun run src/backend/server.ts

# 5. Tester le chat
curl -s -X POST http://localhost:3001/api/chat -H 'Content-Type: application/json' -d '{"message":"test"}'

# 6. Continuer la prochaine tache non-cochee ci-dessus
```

## Regles pour les Sessions Autonomes

1. **TOUJOURS lire PROGRESS.md en premier**
2. **Mettre a jour PROGRESS.md apres chaque tache completee** — cocher la case
3. **Committer apres chaque tache** — petits commits atomiques
4. **bun test doit passer, bun run build doit passer** — verifier avant et apres
5. **Tester en vrai** — curl le backend, pas juste les unit tests
6. **Ne JAMAIS casser ce qui marche**
7. **Si bloque**: documenter dans PROGRESS.md et passer a la tache suivante

## Notes Techniques
- Le binaire Tauri s'appelle `/usr/bin/app` (a fixer → linux-cowork)
- Node.js 18 trop vieux → tout via `bunx --bun`
- bun:sqlite au lieu de better-sqlite3
- gnome-screenshot pour les captures (pas grim, GNOME Wayland)
- API keys dans `~/.config/linux-cowork/settings.json`
- DeepSeek API latence ~1.5s (normal, serveurs en Chine)
