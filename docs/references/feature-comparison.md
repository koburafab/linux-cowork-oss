# Feature Comparison & Market Research

> Analyse competitive + retours utilisateurs pour definir notre roadmap

## Ce Que Les Gens Veulent (Market Research)

### PAIN POINTS CRITIQUES (opportunites directes)

#### 1. Suppression de fichiers destructive (CRITIQUE)
- Un dev a perdu **15,000 photos de famille** — Cowork a execute `rm -rf` en "organisant" le bureau
- Un benchmark a montre **11GB de fichiers supprimes** malgre instructions de retention
- **Notre reponse**: Sandbox obligatoire + undo/rollback + confirmation pour toute suppression

#### 2. Rate limits et drainage d'usage (CONFIANCE BRISEE)
- Sessions Max 5x ($100/mois) vident en ~90 minutes
- Bug de prompt caching qui force reprocessing complet a chaque tour (10-20x le cout)
- Users $200/mois avec service casse et zero support
- **Notre reponse**: BYOK (pay-per-use) + modeles locaux gratuits via Ollama

#### 3. Zero memoire entre sessions (LE PROBLEME AMNESIE)
- Chaque session repart de zero
- Apres compaction contexte, Claude "oublie completement toutes les instructions"
- CLAUDE.md et skills pas charges automatiquement
- **Notre reponse**: Memoire persistante (on a deja ca avec MEMORY.md + shared-agents)

#### 4. Vulnerabilites securite (ARCHITECTURAL)
- Prompt injection via fichier Word avec texte cache → exfiltration fichiers sensibles
- Signale a Anthropic 3 mois avant, rien fait
- Le modele "click Yes" echoue car personne lit les prompts
- **Notre reponse**: Sandbox bwrap + audit trail + pas de raw filesystem access

### FEATURES LES PLUS DEMANDEES

#### 5. Multi-model / BYOK (HAUTE PRIORITE)
- Cowork = Claude only, vendor lock-in total
- Les users veulent switcher selon la tache (cheap/fast vs powerful)
- 60% reduction couts avec setup multi-LLM
- **Notre reponse**: Router multi-model (Claude, Gemini, Grok, Ollama) des le MVP

#### 6. Support Linux (CRITIQUE pour nous)
- Zero support officiel malgre bariere technique triviale (un check de platform)
- "Linux is the dominant platform for software development"
- Reverse-engineering montre que c'est juste un check Electron a bypasser
- Package AUR `claude-cowork-linux` existe deja
- **Notre reponse**: C'EST NOTRE RAISON D'ETRE — Linux-first

#### 7. Privacy / Local-first (HAUTE PRIORITE)
- Cowork envoie les donnees fichiers au cloud
- Telemetrie inclut commandes bash et chemins fichiers
- Self-hosted explose: LocalAI, OpenClaw, AnythingLLM, n8n
- "16GB RAM suffit pour inference CPU via Ollama"
- **Notre reponse**: Tout local par defaut, cloud opt-in uniquement

#### 8. Transparence / Audit Trail (MOYENNE PRIORITE)
- Les users veulent voir exactement ce que l'agent fait a leurs fichiers
- OpenWork cite comme superieur grace a son "Audit Log"
- **Notre reponse**: Log detaille de chaque action, visible en temps reel dans l'UI

### PROBLEMES SECONDAIRES A ADRESSER

| Probleme | Solution |
|----------|----------|
| Task continuity (tache s'arrete si laptop dort) | Background execution, survive sleep |
| Pas de free trial ($200/mois pour beta) | Open-source = gratuit |
| Computer Use lent | Optimiser avec xdotool natif (pas de VM) |
| UX programmer-centric | Templates, presets, UI intuitive |
| Pas de collaboration equipe | Sessions partagees via Hub |

---

## Comparaison Detaillee

### Cowork Officiel vs Clones vs Notre Projet

| Feature | Cowork ($200) | OpenWork | AionUi | **Linux Cowork OSS** |
|---------|---------------|----------|--------|---------------------|
| Linux natif | ❌ | ✅ | ✅ | **✅ First-class** |
| Computer Use | ✅ (macOS) | ❌ | ❌ | **✅ (xdotool)** |
| Multi-model | ❌ Claude only | ✅ | ✅ | **✅ + Ollama local** |
| Sub-agents | ✅ | ❌ | Basique | **✅ (12 agents Trismegis)** |
| Memoire persistante | ❌ | ❌ | ❌ | **✅ (MEMORY.md + SQLite)** |
| Task scheduling | ✅ Basique | ❌ | ❌ | **✅ (Fractal Engine)** |
| Sandbox | ✅ VM | ❌ | ❌ | **✅ (bwrap natif)** |
| Undo/rollback | ❌ | ❌ | ❌ | **✅** |
| Audit trail | ❌ | ✅ | ❌ | **✅** |
| Privacy/local | ❌ Cloud | Partiel | ✅ | **✅ 100% local possible** |
| MCP support | ✅ | ❌ | ❌ | **✅** |
| Skills/plugins | ✅ | ❌ | ❌ | **✅** |
| Hooks system | ✅ | ❌ | ❌ | **✅** |
| Prix | $20-200/mois | Gratuit | Gratuit | **Gratuit** |
| Wayland support | N/A | ❌ | ❌ | **✅** |
| Vision model | Claude only | N/A | N/A | **Multi (Claude/Gemini)** |

### Notre Avantage Unique

```
Aucun concurrent n'a les 3 ensemble:
1. Computer Use Linux natif (xdotool + vision)
2. Multi-agents orchestres (pas juste des sub-tasks)
3. Local-first avec multi-model (Ollama + API)
```

---

## Priorites MVP (basees sur la recherche)

### P0 — Must Have (semaine 1-2)
1. ✅ Desktop app Tauri (Linux natif)
2. ✅ Chat avec multi-model (Claude API + Ollama)
3. ✅ File access securise (sandbox bwrap)
4. ✅ Memoire persistante (SQLite)
5. ✅ Audit trail basique

### P1 — Should Have (semaine 3-4)
6. Computer Use basique (screenshot + xdotool)
7. MCP client
8. Skills/plugins system
9. Task management avec scheduling
10. Hooks system (events)

### P2 — Nice to Have (semaine 5+)
11. Multi-agents orchestration
12. Wayland support complet
13. Team collaboration
14. Templates/presets pour non-devs
15. Undo/rollback pour file operations
