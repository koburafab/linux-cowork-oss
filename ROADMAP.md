# Linux Cowork OSS — Plan complet (issu de l'audit)

État : MVP fonctionnel en local, mais beaucoup de backend **non câblé à l'UI**, pas distribuable en l'état, et failles de sécurité. Ce plan couvre TOUT, par priorité. Chaque item = problème → fix → fichiers.

---

## PHASE 1 — Rendre l'app distribuable (P0) 🔴
*Sans ça, personne d'autre ne peut l'utiliser.*

### 1.1 Embarquer le backend dans le `.deb`
- **Problème** : `src-tauri/src/lib.rs` cherche `server.ts` + `bun` à des chemins devinés (`~/linux-cowork-oss/...`). Sur une machine neuve → « Backend starting… » à l'infini.
- **Fix** : `bun build --compile src/backend/server.ts` → binaire autonome (déjà testé OK, 96 Mo) → déclarer en **sidecar Tauri** (`bundle.externalBin` avec suffixe target-triple) → `lib.rs` lance le sidecar via le plugin shell (plus de chemins devinés, plus de `bun` requis).
- **Fichiers** : `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, script de build.

### 1.2 Écran de connexion au 1er lancement (onboarding)
- **Problème** : aucune UI pour se connecter (ni clé API, ni abo). Un nouvel utilisateur est bloqué.
- **Fix** : assistant 1er lancement → choisir un provider → (a) entrer une clé API **ou** (b) bouton « Se connecter à Claude / ChatGPT » qui lance `claude setup-token` / `codex login` (OAuth navigateur) → test de connexion → chat.
- **Fichiers** : nouveau `components/onboarding/`, `SettingsPanel.tsx`, nouvel endpoint `routes/cli-auth.ts` (status + login).

### 1.3 Détection des providers disponibles
- **Problème** : le modèle par défaut est `claude-cli` (abo) ; sans le CLI installé → erreur cryptique. Modèles indisponibles affichés quand même.
- **Fix** : endpoint `/api/cli-status` (claude/codex installés + connectés). Au démarrage, **griser/retirer** les modèles dont le provider n'est pas prêt. Défaut = un modèle réellement dispo.
- **Fichiers** : `routes/cli-auth.ts`, `core/models/types.ts`, `ModelSelector.tsx`, `SettingsPanel.tsx`.

### 1.4 Dépendances système
- **Problème** : `gnome-screenshot`, `xdotool` (computer-use) pas déclarés → fonctions cassées sur machine neuve.
- **Fix** : les ajouter aux `depends` du `.deb`, ou les détecter et prévenir.
- **Fichiers** : `tauri.conf.json`.

---

## PHASE 2 — Sécurité (P0) 🔴

### 2.1 Clés API hors du fichier en clair
- **Problème** : clés stockées en clair dans `~/.config/linux-cowork/settings.json`.
- **Fix** : coffre-fort de l'OS via le plugin **keyring** Tauri (Secret Service/libsecret sur Linux).
- **Fichiers** : `core/settings.ts`, intégration Tauri.

### 2.2 Verrouiller le backend
- **Fait** : écoute sur `127.0.0.1` ✅.
- **Reste** : remplacer le CORS ouvert (`hono/cors`) par origine-app uniquement + jeton de session ; définir une **CSP** stricte (actuellement `null`).
- **Fichiers** : `backend/server.ts`, `tauri.conf.json`.

### 2.3 Garde-fous agent (human-in-the-loop)
- **Problème** : en mode agent, actions exécutées sans confirmation (claude `bypassPermissions`).
- **Fix** : modale d'approbation pour les actions à risque (shell, suppression, contrôle souris/clavier) + journal d'audit réel.
- **Fichiers** : `core/models/router.ts`, nouvelle UI d'approbation, `AuditPanel.tsx`.

---

## PHASE 3 — Corriger les vrais bugs (P1) 🟠

| Bug | Fichier | Fix |
|---|---|---|
| Agents spawnés avec config bidon (`provider:'anthropic'` codé en dur, sans clé) | `routes/agents.ts:44-52` | Résoudre le modèle via `DEFAULT_MODELS` + injecter la clé comme `resolveModelConfig()` |
| `spawnAgent()` n'envoie pas le modèle choisi | `AgentPanel.tsx:62` | Passer `model: activeModel.id` |
| Clé OpenAI manquante en mode autonome | `routes/autonomous.ts:69-79, 188-192` | Ajouter le check `openai.com` (comme dans `chat.ts`) |
| Modèle pas restauré en rouvrant une conversation | `ConversationList.tsx:61-74` | `setActiveModel()` depuis `conv.model` |
| Champ settings `model` vs `activeModel` (incohérence) | `SettingsPanel.tsx:62-64` | Aligner sur `activeModel` |
| Boutons du chat qui chevauchent l'heure/texte | `App.css` + `MessageList`/footer | Corriger le positionnement (CSS) |
| 2 boutons doublons (Open in Browser / Detach) | `ArtifactViewer.tsx:116-133` | Fusionner ou différencier |
| `streamChat` n'envoyait pas le modèle | `api/client.ts` | **Fait ✅** |

---

## PHASE 4 — Brancher les features « fantômes » (P1) 🟠
*Codées en backend, invisibles dans l'UI.*

- **Mode autonome** : endpoint `routes/autonomous.ts` existe, `isAutonomous` jamais mis à `true`, aucun bouton. → ajouter un déclencheur dans `ChatInput`/`AgentPanel`.
- **Gestion mémoire** : `routes/memories.ts` (CRUD) sans UI. → panneau Mémoire (voir/ajouter/supprimer).
- **Exécution de workflows** : `POST /workflows/:id/run` jamais appelé (le `WorkflowGrid` copie juste le prompt). → exécuter réellement.
- **Task Manager** : `core/task/manager.ts` complet mais **0 route**. → routes + panneau, ou supprimer si inutile.
- **Outils d'un serveur MCP** : `GET /mcp/tools/:name` jamais appelé. → afficher les outils dans le PluginBrowser.

---

## PHASE 5 — Optimisation tokens & polish (P2) 🟢

### Tokens
- **Caching** : les CLI Claude font déjà du prompt-caching auto (~90% d'économie sur le contexte répété).
- **Sessions natives** : utiliser `claude --resume <session>` / `codex resume <thread>` par conversation au lieu de renvoyer tout l'historique → grosse économie de tokens + meilleur contexte agent. (Mapping `conversationId → sessionId` en base.)
- **Troncature** : limiter l'historique envoyé (fenêtre glissante) pour les providers API.
- **Affichage** : étendre le `TokenCounter` au coût par message + cumulé.

### Polish UX (standards du domaine)
- **Bouton Stop** pendant la génération + **Regenerate**.
- **Streaming** plus fin (les CLI rendent par blocs, pas token-par-token).
- **Export / recherche** des conversations, éditeur de system-prompt, pièces jointes.
- **MCP registry** : ajouter un serveur depuis une liste (style Smithery) en plus du formulaire.
- **Panneau Audit** : le rendre utile (vrai journal d'actions) ou le retirer (aujourd'hui il duplique le texte).
- **i18n** : messages FR/EN mélangés → uniformiser.
- Écran d'accueil + version/À-propos.

---

## Ordre conseillé
1. **Phase 1** (distribution) — c'est ce qui débloque l'usage par d'autres.
2. **Phase 3** (bugs) — rapide, rend l'existant fiable.
3. **Phase 2** (sécurité) — avant toute diffusion.
4. **Phase 4** (features fantômes) — valeur ajoutée.
5. **Phase 5** (polish) — finition.
