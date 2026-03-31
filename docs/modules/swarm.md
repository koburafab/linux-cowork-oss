# Module: Swarm — Orchestration Multi-Agents

> Comment Claude Code gere les sub-agents en parallele

## Vue d'ensemble

Le module swarm permet de spawner des agents qui travaillent en parallele sur des sous-taches. C'est l'equivalent de ce que Trismegis fait deja avec ses 12 agents, mais integre directement dans l'outil.

## Architecture

```
┌──────────────────────────────────────┐
│            Leader Agent               │
│  (orchestre, delegue, valide)         │
├──────────┬──────────┬────────────────┤
│ Agent 1  │ Agent 2  │ Agent N        │
│ (in-proc)│ (pane)   │ (in-proc)      │
└──────────┴──────────┴────────────────┘
     │           │           │
     └───────────┴───────────┘
           Communication
     (fichiers + callbacks + mailbox)
```

## Modeles d'Execution

### 1. In-Process (AsyncLocalStorage)
- Agent tourne dans le meme process Node.js
- Isolation via `AsyncLocalStorage` (contexte persiste across async boundaries)
- Acces synchrone a `AppState`
- Communication directe via callbacks React

### 2. Pane-Based (tmux/iTerm2)
- Agent tourne dans un process separe
- Cree un pane tmux ou iTerm2
- Communication async via mailbox fichier
- Fallback: iTerm2 → tmux → in-process

```
Detection backend:
1. iTerm2 disponible ? → utiliser iTerm2
2. tmux disponible ? → utiliser tmux
3. Sinon → in-process
```

## Communication

### Canaux
1. **File-based mailbox** — tous les teammates (async, persistant)
2. **React callbacks** — in-process uniquement (sync, rapide)

### Priorite des messages
```
1. Shutdown requests (priorite max)
2. Leader messages
3. Peer messages
4. Tasks (priorite min)
```

### Team File
Fichier partage qui contient l'etat de l'equipe:
```typescript
{
  members: [
    { id: string, name: string, status: 'active' | 'idle' | 'done' }
  ],
  tasks: [...],
  messages: [...]
}
```

## Gestion des Permissions

Le systeme de permissions est synchronise entre agents:
```
Agent request permission
    ↓
Leader UI ou mailbox recoit la demande
    ↓
Leader repond (approve/deny)
    ↓
Agent recoit callback, continue ou arrete
```

## Task Coordination

- **Task list** partagee: `~/.claude/tasks/{team-name}/`
- **Claiming** lock-free via status tracking
- **High water mark** file pour eviter collisions d'ID

## Fichiers Source

```
swarm/
├── teamHelpers.ts          # State management equipe (684 lignes)
├── spawnInProcess.ts       # Spawn in-process (216 lignes)
├── inProcessRunner.ts      # Boucle agent + permissions (1400+ lignes)
├── permissionSync.ts       # Coordination permissions (929 lignes)
├── backends/
│   ├── registry.ts         # Detection + cache backends (465 lignes)
│   ├── InProcessBackend.ts # Executeur in-process (340 lignes)
│   └── PaneBackendExecutor.ts # Adaptateur pane (355 lignes)
└── ... (21 fichiers total)
```

## Points Cles pour Linux Cowork

1. **On a deja un systeme multi-agents** (Trismegis 12 agents) — le swarm de Claude Code est une version simplifiee
2. **Le pattern in-process est le plus pertinent** pour notre cas — pas besoin de tmux/iTerm2
3. **La mailbox fichier est un bon pattern** — simple, debuggable, persistant
4. **AsyncLocalStorage** est la cle pour l'isolation in-process — a garder
5. **Le team file** peut etre remplace par notre base SQL existante (83 tables dans le Hub)
