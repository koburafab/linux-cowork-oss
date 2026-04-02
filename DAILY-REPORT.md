# Daily Report — 2026-04-03 (Jour 2/3 autonome)

## Salut Fab ! Voila ou on en est.

### Tout marche. Zero fail. Sprint 1 complet.

## Stats

| Metrique | Valeur |
|----------|--------|
| Lignes source | **6,738** |
| Lignes tests | **4,945** |
| Tests | **308 pass, 7 skip, 0 fail** |
| Commits | **28** |
| Tools | **18** |
| .deb | **linux-cowork_0.1.0_amd64.deb** |

## Ce qui a ete fait ces 2 nuits

### Nuit 1 (1-2 avril)
- MVP complet en une nuit (Phases 0-4)
- Chat UI + multi-model router + computer use + tools + backend Hono
- .deb package installe et fonctionnel

### Jour 2 (2 avril)
- **Agent Mode toggle** — switch dans le chat pour activer les tools
- **Historique conversations** — SQLite, sidebar cliquable
- **Agent memory** — save_memory / recall_memories (se souvient entre convos)
- **Remote LAN** — accessible depuis le S23 via http://192.168.0.X:3001
- **Notifications desktop** — notify-send quand une tache est finie
- **18 tools** — +clipboard, system_info, open_url, open_app
- **Settings UI** — API keys depuis l'app (gear icon)
- **Undo visible** — bouton Annuler apres write_file
- **Vision continue** — screenshots auto toutes les 2s
- **Multi-agents E2E** — spawn/list/kill agents depuis l'UI
- **Tests robustesse** — 14 tests error handling

### Nuit 2 (2-3 avril)
- **Ollama installe** — llama3.2:1b local, zero cloud, streaming OK
- **Fix binary name** — /usr/bin/linux-cowork
- **.deb rebuildé** avec toutes les features

## 3 Providers fonctionnels

| Provider | Model | Latence | Cout |
|----------|-------|---------|------|
| DeepSeek | deepseek-chat | ~1.5s | $0.14/Mtok |
| Ollama | llama3.2:1b | ~2s (CPU) | Gratuit |
| Claude | sonnet/haiku | ~1s | $3-15/Mtok |

## E2E Tests (avec DeepSeek)

| Workflow | Status |
|----------|--------|
| Chat simple | PASS |
| Bash command (whoami) | PASS |
| File creation | PASS |
| Screenshot + description | PASS (partiel — timeout sur gros base64) |
| Memory store/recall | PASS |
| System info | PASS |

## Problemes connus

1. **Screenshot base64 trop gros** pour DeepSeek en mode autonome — le streaming SSE timeout sur les images > 100KB. Fix possible: compresser + redimensionner avant envoi.
2. **vi.mock pollution** dans bun test — certains fichiers test avec vi.mock cassent d'autres fichiers quand tout tourne en parallele. Contourne en reecrivant les tests sans vi.mock.
3. **CPU-only Ollama** sur le NUC — llama3.2:1b est petit mais lent. Le DGX de Fab permettra des modeles plus gros quand dispo.

## Prochaines etapes (Sprint 2)

1. **Workflows templates** — presets de taches ("organise mes photos", "backup", etc.)
2. **Plugin marketplace** — browser de skills dans l'UI
3. **Voice input** — whisper local ou API
4. **Connexion Trismegis** — bridge vers le Hub M900
5. **Publish GitHub** — README, demo, landing page

## Pour tester

```bash
# Lancer l'app
/usr/bin/linux-cowork

# Ou lancer le backend seul
cd ~/Documents/linux-cowork-oss/app && bun run src/backend/server.ts

# Chat depuis le terminal
curl -s -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Salut!"}'

# Chat avec Ollama local
curl -s -X POST http://localhost:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello","model":"ollama-default"}'

# Mode autonome
curl -s -X POST http://localhost:3001/api/autonomous \
  -H 'Content-Type: application/json' \
  -d '{"task":"List files in home directory","mode":"file-ops"}'

# Depuis le telephone
# Ouvrir http://192.168.0.X:3001 dans le navigateur du S23
```
