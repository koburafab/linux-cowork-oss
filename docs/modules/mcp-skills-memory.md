# Modules: MCP, Skills, Memory, Tasks, Hooks

> Les 5 modules d'infrastructure qui font tourner Claude Code

## 1. MCP Client (`utils/mcp/`)

### Role
Parsing et validation des inputs d'outils MCP, avec support date/heure en langage naturel.

### Composants
- **dateTimeParser.ts** — Convertit langage naturel → ISO 8601 via Haiku
  - "tomorrow at 3pm", "next Monday", "in 2 hours" → ISO 8601
  - Timezone-aware avec timezone local
  - Formats: 'date' (YYYY-MM-DD) et 'date-time' (full ISO 8601)

- **elicitationValidation.ts** — Validation inputs via Zod schemas
  - Pipeline: sync Zod → si echec date/time → NL parsing via Haiku → resultat combine
  - Support: strings, numbers, integers, booleans, enums, multi-select

### Pour Linux Cowork
- Le MCP est un **protocol standard** — on implementera un client compatible
- Le parsing NL date/time est un nice-to-have, pas critique pour le MVP

---

## 2. Skills/Plugins (`utils/skills/`)

### Role
Monitoring et gestion des fichiers de skills en temps reel.

### Composant Principal: skillChangeDetector.ts

```
Directories surveillees:
  ~/.claude/skills       (user skills)
  ~/.claude/commands     (user commands)
  .claude/skills         (project skills)
  .claude/commands       (project commands)
  + directories additionnelles via --add-dir
```

### Debouncing
- FILE_STABILITY_THRESHOLD_MS: 1000ms (attend que les ecritures se stabilisent)
- RELOAD_DEBOUNCE_MS: 300ms (batch les evenements rapides)
- POLLING_INTERVAL_MS: 2000ms (polling stat() pour Bun)

### Events
- Execute hooks `ConfigChange` avec type 'skills'
- Clear les caches de commandes et memoization
- Reset les noms de skills envoyes
- Emet signal de changement aux subscribers

### Pour Linux Cowork
- **Pattern hot-reload excellent** — on le garde pour nos plugins
- Utiliser **chokidar** (ou inotify directement) pour le file watching
- Le systeme de skills peut etre etendu pour les agents Trismegis

---

## 3. Memory (`utils/memory/`)

### Role
Definitions de types pour la memoire persistante (module minimal).

### Types
```typescript
type MemoryType =
  | 'User'      // Partagee tous projets (~/.claude)
  | 'Project'   // Specifique projet (.claude/memory)
  | 'Local'     // Session-local temporaire
  | 'Managed'   // Geree par le systeme
  | 'AutoMem'   // Collection automatique
  | 'TeamMem'   // Memoire equipe (feature-gated)
```

### Pour Linux Cowork
- On a deja un systeme de memoire (MEMORY.md + shared-agents/memory/)
- Peut etre etendu avec les types TeamMem pour la collaboration multi-agents

---

## 4. Task Management (`utils/task/`)

### Role
Gestion complete du cycle de vie des taches: creation → execution → completion.

### Composants

#### framework.ts — State Management
```
Lifecycle: pending → running → completed/failed/killed
Grace period: 30s avant eviction des taches terminees
Polling: 1000ms
```

#### TaskOutput.ts — Buffering Double Mode
- **File mode** (bash): stdout/stderr → fichier directement via fd
- **Pipe mode** (hooks): data → buffer memoire → disk si overflow

```
Limites:
  8MB buffer memoire par tache
  1000 lignes buffer circulaire
  5GB cap disque total
  32KB output max par defaut (160KB max)
```

#### diskOutput.ts — Persistance Disque
```
$PROJECT_TEMP/[sessionId]/tasks/[taskId].output
```
- Write queue avec drain loop async
- Fire-and-forget chunk writing
- O_NOFOLLOW flag (previent attaques symlink)

### Pour Linux Cowork
- **Architecture solide** — on s'en inspire fortement
- Le double mode file/pipe est intelligent pour les performances
- Le cap memoire/disque evite les runaway tasks

---

## 5. Hooks System (`utils/hooks/`)

### Role
Systeme d'extensibilite event-driven — le coeur de la customisation.

### Architecture
```
Settings → Snapshot → Config Manager → Matchers
    ↓
Session Hooks (in-memory)
    ↓
Hook Execution (command/prompt/agent/http/function)
    ↓
Events → SDK notifications
```

### 14+ Types d'Evenements
```typescript
SessionStart       // Initialisation session
Setup              // Setup complete
UserPromptSubmit   // Utilisateur soumet prompt
PreToolUse         // Avant execution outil
PostToolUse        // Apres succes outil
PostToolUseFailure // Apres erreur outil
PermissionDenied   // Classifier dit non
Notification       // Notification affichee
Stop               // Avant reponse complete
SubagentStop       // Apres completion subagent
StopFailure        // Hook stop a echoue
CwdChanged         // Repertoire de travail change
FileChanged        // Fichier surveille modifie
ConfigChange       // Settings ou skills changes
```

### 5 Modes d'Execution
```typescript
command  // Shell command
prompt   // LLM evaluation (via Haiku)
agent    // Multi-turn LLM avec outils
http     // Endpoint HTTP externe
function // Callback TypeScript (session-only)
```

### Sources de Hooks (priorite decroissante)
1. userSettings (~/.claude/settings.json)
2. projectSettings (.claude/settings.json)
3. localSettings (.claude/settings.local.json)
4. Plugin hooks
5. Built-in hooks

### Securite
- **SSRF guard** bloque les adresses privees/link-local (sauf loopback)
- **CRLF injection** prevention via sanitization headers
- **Env var allowlist** pour interpolation securisee
- **Timeout** configurable (defaut 15s async, 30s prompt, 60s agent)

### Skill Improvement (Avance)
- Batch 5 tours utilisateur avant analyse
- Query modele pour identifier patterns de preferences
- Genere suggestions SkillUpdate
- Applique updates au fichier skill (fire-and-forget)

### Pour Linux Cowork
- **Le systeme de hooks est le plus important a garder** — c'est la colonne vertebrale
- Les 14 events couvrent tous les points d'extension necessaires
- Le mode `http` permet l'integration avec des services externes (Hub, n8n)
- Le mode `agent` permet des hooks intelligents (pas juste des scripts)
- **Integration avec nos hooks existants** (session-startup.sh, etc.)
