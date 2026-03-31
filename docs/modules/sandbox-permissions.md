# Modules: Sandbox, Permissions, Shell, Bash Parser, Settings

> La couche securite complete de Claude Code

## 1. Sandbox (`utils/sandbox/`)

### Role
Isolation OS-level via bubblewrap (bwrap) — convertit les settings Claude Code en config sandbox.

### Architecture
```
Claude Code Settings (permissions.allow/deny)
    ↓
sandbox-adapter.ts (conversion)
    ↓
@anthropic-ai/sandbox-runtime (bwrap)
    ↓
OS-level isolation (namespaces, seccomp)
```

### Protections Multi-Couches
1. Settings files (.claude/settings.json) → ecriture bloquee inconditionnellement
2. Directories dangereuses (.claude/skills, .git) → protegees au niveau OS
3. Fichiers bare git repo (HEAD, objects, refs) → scrubbed post-commande
4. Worktree: repo principal accessible en ecriture quand session en worktree

### Reseau
- Domaines autorises/bloques extraits des regles WebFetch
- Mode managed-only: seuls les domaines policy sont autorises
- Prevention SSRF

### Filesystem
- CWD et temp Claude toujours writables
- Directories additionnelles via `--add-dir`
- Deny-within-allow respecte (deny gagne sur allow parent)
- Support glob patterns

### Convention Chemins
```
//path   → chemin absolu /path (escape double-slash CC)
/path    → relatif au dossier settings
~/path   → expansion home directory
./path   → relatif au dossier settings
```

### Pour Linux Cowork
- **bwrap est deja natif Linux** — c'est un avantage enorme
- On peut utiliser `firejail` comme alternative plus simple
- L'isolation namespace Linux est superieure a ce que macOS offre

---

## 2. Permissions (`utils/permissions/`)

### Role
Systeme de controle d'acces multi-couches avec 6 modes de permission.

### Modes
| Mode | Comportement |
|------|-------------|
| `default` | Prompt sur operations suspectes |
| `plan` | Review avant execution |
| `acceptEdits` | Auto-approve edits fichiers (safety checks gardees) |
| `bypassPermissions` | Skip tous les checks (dangereux) |
| `dontAsk` | Auto-deny sur operations suspectes |
| `auto` | Classifier AI avec denial tracking |

### Pipeline de Decision
```
Tool Use Request
    ↓
Load Permission Rules (toutes sources, priorite)
    ↓
Apply Deny Rules → si deny: DENY
    ↓
Apply Allow Rules → si allow: ALLOW
    ↓
Check Classifier (si auto mode)
    → denialTracking: max 3 consecutifs, 20 total
    → si fallback: ASK
    ↓
Default selon PermissionMode
```

### Sources de Regles (priorite decroissante)
1. policySettings (enterprise, priorite max)
2. flagSettings (CLI --settings)
3. localSettings (project-local, gitignored)
4. projectSettings (partage equipe)
5. userSettings (global, priorite min)

### Fichiers Dangereux Proteges
```
.gitconfig, .gitmodules, .bashrc, .bash_profile,
.zshrc, .zprofile, .profile, .ripgreprc, .mcp.json, .claude.json
```

### Directories Dangereuses
```
.git, .vscode, .idea, .claude
```

### Classifier Auto-Mode (yoloClassifier.ts)
- Side-query a une instance Claude separee
- Regles configurables: allow, soft_deny, environment
- Denial tracking: fallback vers prompt humain apres N denials

### Pour Linux Cowork
- **Le systeme de permissions est over-engineered pour notre cas** — simplifier
- Garder: deny/allow rules, mode default/auto
- Dropper: enterprise policies, MDM support (pas notre cible)
- L'auto-mode avec classifier est interessant pour le futur

---

## 3. Shell Execution (`utils/shell/`)

### Role
Abstraction pour executer des commandes bash/PowerShell avec sandbox.

### Shell Providers
- **BashProvider**: snapshot env, extended glob disable, CWD tracking, sandbox integration
- **PowerShellProvider**: profile suppression, exit code handling, encoded commands

### Shell Snapshot
Capture l'environnement shell courant:
- Fonctions, aliases, variables
- Initialisation session-specific
- Wrappers ripgrep/find/grep

### Read-Only Command Validation
Allowlists exhaustives pour commandes safe:
- Git read-only: `git diff`, `git log`, `git show`, `git status`...
- External tools: `npm`, `yarn`, `python`, `node`, `curl`...
- GitHub CLI: `gh api`, `gh pr view`, `gh issue list`...

### Pour Linux Cowork
- **Bash uniquement** — pas besoin de PowerShell
- Le shell snapshot est un bon pattern pour l'isolation
- La validation read-only est utile pour le mode auto-approve

---

## 4. Bash Parser (`utils/bash/`)

### Role
Parser bash pure-TypeScript avec analyse de securite AST-based.

### bashParser.ts (130K)
- Parser/tokenizer complet avec offsets UTF-8
- Timeout 50ms pour input adversariel
- Budget max 50,000 noeuds
- Supporte: heredocs, command substitution, arithmetic, process substitution, parameter expansion

### ast.ts (112K) — Analyse Securite
```typescript
type ParseForSecurityResult =
  | {kind: 'simple', commands: SimpleCommand[]}      // Safe, analyse
  | {kind: 'too-complex', reason: string}             // Pas safe, demander
  | {kind: 'parse-unavailable'}                       // Parser indispo
```

**Design fail-closed**: tout node type pas explicitement allowliste → 'too-complex' → prompt permission

### Variables Safe
```
HOME, PWD, USER, PATH, HOSTNAME, SHELL, TMPDIR, SHLVL...
```
- Variables dangereuses (bare `$IFS`) → rejetees
- Command substitution → marque comme dynamique

### Pour Linux Cowork
- **Le parser bash est impressionnant mais lourd** (130K + 112K)
- Pour le MVP: utiliser un parser existant (bash-parser npm) ou simplifier
- Le pattern fail-closed est essentiel a garder

---

## 5. Settings (`utils/settings/`)

### Role
Configuration multi-sources avec change detection et support MDM enterprise.

### Sources
```
userSettings      ~/.claude/settings.json (global)
projectSettings   .claude/settings.json (partage)
localSettings     .claude/settings.local.json (gitignored)
flagSettings      CLI --settings (read-only)
policySettings    managed-settings.json + drop-ins (enterprise)
```

### Merging Strategy
- Permissions: arrays merge (append), pas replace
- Hooks: merge par name/pattern
- Scalaires: derniere source gagne
- Objects: deep merge

### Change Detection
- File watcher sur tous les settings.json
- Stabilisation 1000ms avant notification
- Grace period 5000ms pour ignorer ecritures internes
- Grace 1700ms pour pattern delete-and-recreate

### Pour Linux Cowork
- **Simplifier**: user + project + local suffit
- Pas besoin de MDM/enterprise pour le MVP
- Le change detection hot-reload est utile
- Format JSON standard, facile a adapter
