# Module: Ultraplan — Systeme de Planification

> Comment Claude Code decompose et execute des plans complexes

## Vue d'ensemble

Ultraplan est le systeme de planification qui permet a Claude de decomposer une tache complexe en etapes, obtenir l'approbation de l'utilisateur, puis executer le plan (localement ou a distance).

## Cycle de Vie (4 Phases)

```
Phase 1: Generation du plan
    (mode read-only, outils d'exploration uniquement)
    ↓
Phase 2: Polling pour approbation
    (attente via CCR — Cloud-Based Remote Execution)
    ↓
Phase 3: Approbation
    (dialog navigateur pour solo, mailbox pour equipe)
    ↓
Phase 4: Execution
    (remote ou local teleport)
```

## Composants Cles

### ExitPlanModeScanner (Machine a Etats Pure)

Classificateur stateless pour le flux d'evenements:
- Ingere des batches de SDKMessage
- Retourne un ScanResult
- Suit les tool calls, results, rejections, et terminaison session

**Precedence**: `approved > terminated > rejected > pending > unchanged`

### pollForApprovedExitPlanMode (Boucle de Polling)

- Polling toutes les 3 secondes
- Pagination via `pollRemoteSessionEvents()`
- Tracking des phases: `running` → `needs_input` → `plan_ready`
- Retry avec limite de 5 echecs
- Timeout differentie: jamais-atteint vs pending-timeout

### Detection de Mots-Cles

Detecte les mentions "ultraplan" tout en excluant les faux positifs:
- Filtre dans les plages quotees (backticks, quotes, brackets)
- Exclusion contexte path-like (`src/ultraplan/foo.ts`)
- Filtre semantique (ignore les questions avec `?`)

## Integration avec Swarm

```
Teammate genere un plan → Appelle ExitPlanMode
    ↓
ExitPlanModeTool detecte isPlanModeRequired()
    ↓
Envoie plan_approval_request au lead via mailbox
    ↓
Lead approuve via plan_approval_response
    ↓
Teammate notifie, passe a l'implementation
```

### Ressources Partagees
- **Task List**: tous les teammates + leader partagent `~/.claude/tasks/{team-name}/`
- **Mailbox**: messages d'approbation asynchrones
- **Context**: AsyncLocalStorage pour isolation in-process
- **ID Counter**: high water mark pour eviter collisions

## Principes de Design

1. **Machine a etats pure** — pas d'effets de bord, testable isolement
2. **Polling resilient** — retry avec detection erreurs transitoires
3. **Approbation flexible** — dialog standalone vs routing mailbox equipe
4. **Mode remote safe** — permissions read-only au niveau CCR
5. **Coordination cooperative** — file locking, AsyncLocalStorage, isolation par team name

## Points Cles pour Linux Cowork

1. **Le pattern plan → approve → execute est excellent** — on le garde
2. **Pas besoin de CCR** pour le MVP — approbation locale suffit
3. **La machine a etats pure est un bon pattern** — facilite les tests
4. **Integration avec notre Fractal Engine** possible — le mission-runner fait deja du cron */5
5. **L'approbation peut passer par le Hub** (UI web) au lieu d'un dialog browser
