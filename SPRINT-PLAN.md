# Sprint Plan — 3 jours autonome (2-4 avril 2026)

## Principe
Chaque tache = implementer + tester E2E avec DeepSeek + screenshot preuve + commit.
Pas de code mort. Tout doit marcher.

---

## JOUR 1 (2 avril) — L'app qui se souvient

### J1-T1: Historique conversations (SQLite)
**Quoi:** Sauvegarder chaque conversation dans la DB. Pouvoir la recharger.
**Comment:**
1. Route `POST /api/conversations` — cree une conversation, retourne l'ID
2. Route `GET /api/conversations` — liste toutes les conversations
3. Route `GET /api/conversations/:id/messages` — charge les messages d'une convo
4. Le backend sauve automatiquement chaque message dans la DB pendant le chat
5. Au demarrage, charger la derniere conversation
**Test:** Envoyer 3 messages → restart backend → les messages sont toujours la
**Screenshot:** L'app avec les messages recharges apres restart

### J1-T2: Sidebar conversations
**Quoi:** Panel lateral gauche avec la liste des conversations passees
**Comment:**
1. `src/components/sidebar/ConversationList.tsx` — liste cliquable
2. Modifier `src/App.tsx` — layout 3 colonnes (sidebar | chat | agent)
3. Chaque conversation affiche: titre (premier message tronque) + date
4. Clic → charge les messages de cette conversation
5. Bouton "Nouvelle conversation"
**Test:** Creer 3 conversations, naviguer entre elles
**Screenshot:** Sidebar avec 3 conversations visibles

### J1-T3: Memoire agent
**Quoi:** L'agent se souvient de l'utilisateur entre les conversations
**Comment:**
1. Table `memories` existe deja dans la DB
2. Route `POST /api/memories` — sauver un souvenir
3. Route `GET /api/memories` — recuperer les souvenirs
4. Le system prompt inclut les memories au debut ("Things I know about the user: ...")
5. L'agent peut appeler un tool `save_memory` pour retenir quelque chose
6. Ajouter `save_memory` et `recall_memories` au tool registry
**Test:** Dire "Mon nom est Fab" → nouvelle conversation → "Comment je m'appelle?" → doit repondre Fab
**Screenshot:** La conversation ou l'agent se souvient du nom

---

## JOUR 2 (3 avril) — Remote + polish

### J2-T1: Remote access depuis le telephone
**Quoi:** Piloter l'app depuis le S23 Galaxy via le navigateur
**Comment:**
1. Backend ecoute sur 0.0.0.0:3001 (pas juste localhost)
2. Creer une page web legere `/` qui sert l'UI directement
3. Ou: exposer le dist/ de Vite via le backend Hono
4. Tester depuis un autre device sur le LAN
**Test:** Ouvrir http://192.168.0.X:3001 depuis le navigateur du tel
**Screenshot:** L'UI Cowork ouverte dans le navigateur mobile

### J2-T2: Notifications desktop
**Quoi:** L'agent notifie quand il a fini une tache
**Comment:**
1. `src/core/notifications.ts` — appelle `notify-send`
2. Appeler a la fin du tool-use loop
3. Inclure un resume de ce qui a ete fait
**Test:** Lancer une tache autonome, verifier la notification
**Screenshot:** La notification GNOME

### J2-T3: Fix nom binaire + packaging propre
**Quoi:** `/usr/bin/linux-cowork` au lieu de `/usr/bin/app`
**Comment:**
1. Modifier tauri.conf.json productName
2. Ajouter une icone (generer avec tauri icon)
3. Rebuild .deb
**Test:** `which linux-cowork` retourne `/usr/bin/linux-cowork`

---

## JOUR 3 (4 avril) — Impressionner Fab

### J3-T1: Demo workflow autonome
**Quoi:** Tester un vrai workflow computer use end-to-end
**Comment:**
1. Mission: "Create a file called hello.txt on the Desktop with today's date"
2. Mission: "Open the file manager and navigate to Documents"
3. Mission: "List all files in my home directory and tell me which ones are biggest"
4. Documenter chaque mission avec screenshots avant/apres
**Test:** Les 3 missions doivent reussir
**Screenshot:** Avant et apres chaque mission

### J3-T2: Conversation avec l'agent sur l'app elle-meme
**Quoi:** Demander a DeepSeek de reviewer notre propre code
**Comment:**
1. Activer Agent mode
2. "Read the file src/backend/server.ts and suggest improvements"
3. "Run the tests and tell me if anything fails"
4. Documenter ses suggestions
**Screenshot:** L'agent qui review le code

### J3-T3: Daily report final
**Quoi:** Preparer un rapport complet pour le retour de Fab
**Comment:**
1. Stats finales (lignes, tests, commits)
2. Screenshots de toutes les features
3. Liste des bugs connus
4. Prochaines etapes recommandees
5. Demo video si possible (via screenshots sequences)

---

## Verification a chaque tache

```
1. bun test → doit passer
2. bun run build → doit passer
3. curl E2E → doit marcher
4. gnome-screenshot → preuve visuelle
5. git commit → trace
6. PROGRESS.md → mis a jour
```
