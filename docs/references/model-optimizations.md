# Model API Optimizations — Reference Guide

## DeepSeek V3.2 (deepseek-chat)

**Optimal pour:** Tool use rapide, tasks bien definies, budget limite

| Parametre | Valeur | Raison |
|-----------|--------|--------|
| temperature | 0.3 | Deterministe pour agents |
| top_p | 0.9 | - |
| max_tokens | 4096 | Suffisant pour agents |
| tool_choice | auto | Le model decide |
| response_format | json_object | Si besoin de parsing deterministe |

**Prefix Caching:** Automatique, 95% reduction sur cache hits ($0.014/M vs $0.28/M)
- Mettre system prompt + tool definitions au DEBUT (stable prefix)
- Memories/user context a la FIN (variable suffix)
- Minimum 64 tokens pour cache
- Pas de config necessaire — DeepSeek cache automatiquement

**Context:** 128K tokens input, 8K output
**Pricing:** $0.28/M input, $0.42/M output, $0.014/M cache hits

**Limites:** Pas de vision (images), pas de hard rate limits (dynamique)

---

## Kimi K2.5 (kimi-k2.5)

**Optimal pour:** Vision, screenshots, deep research, exploration, agent swarm

| Parametre | Valeur | Raison |
|-----------|--------|--------|
| temperature | 0.6 | Mode instant (pas thinking) |
| top_p | 0.95 | Fixe par Kimi |
| max_tokens | 8192 | Reduit pour latence desktop |
| thinking | false | Pas pour agents (latence) |
| tool_choice | auto | Kimi decide seul |

**Cache:** Automatique, 75% reduction ($0.15/M vs $0.60/M)
- Session affinity via header `x-session-affinity` pour multi-turn
- Meme structure que DeepSeek: stable prefix, variable suffix

**Vision:** PNG, JPEG, WebP, GIF (max 4K), Video MP4/MOV/AVI (max 2K)
- Base64 image_url format: `data:image/jpeg;base64,{data}`

**Built-in Tools:** web_search, code_runner, rethink, file_reader
- NE PAS specifier dans le system prompt — Kimi decide autonomement

**Agent Swarm:** Jusqu'a 100 sous-agents paralleles, 1500 etapes coordonnees

**Context:** 256K tokens (gratuit, pas de surcharge)
**Pricing:** $0.60/M input, $2.50/M output, $0.15/M cache

---

## Claude (Anthropic)

**Optimal pour:** Raisonnement profond, computer use officiel, qualite max

### Prompt Caching
- Reduction 90% couts, 85% latence
- Cache ecrit: 1.25x prix (5min) ou 2x (1h)
- Minimum 1024 tokens pour declencher le cache
- Structure: [STABLE system/examples] + [VARIABLE user input]

### Extended Thinking (Adaptive)
- `thinking: {type: "adaptive"}` avec `effort` parameter
- Minimum budget: 1024 tokens
- Au-dessus de 32K tokens → utiliser Batch API
- Opus 4.6: 128K output, Sonnet 4.6: 64K output

### Pricing

| Model | Input | Output | Cas d'usage |
|-------|-------|--------|-------------|
| Haiku 4.5 | $1/M | $5/M | Classification, extraction, routing |
| Sonnet 4.6 | $3/M | $15/M | General, production |
| Opus 4.6 | $5/M | $25/M | Deep reasoning, orchestration |

### Computer Use API
- Officiel en avril 2026
- Natif dans les modeles recents

---

## Grok (xAI)

**Optimal pour:** Contexte massif (2M tokens), fallback rapide

| Model | Input | Output |
|-------|-------|--------|
| Grok 4.1 Fast | $0.20/M | $0.60/M |
| Grok 4 | $2/M | $6/M |

**Context:** 2 MILLIONS tokens (le plus grand du marche)
**Tools integres:** Web search ($5/1K calls), code execution ($5/1K calls), X search

---

## OpenRouter

**Auto Router:** Analyse la complexite, selectionne le model optimal
- `route: "cheapest"` pour forcer le moins cher
- Fallback automatique < 2s si timeout/erreur
- Billing seulement sur runs reussis

---

## Smart Model Routing (a implementer)

```
Etape 1: Classification (Haiku $1/M)
  → Simple → Haiku
  → Medium → Sonnet / DeepSeek
  → Complex → Opus / Kimi thinking

Lookup table:
  classification/extraction → haiku
  general_qa → sonnet / deepseek
  code_review → sonnet
  document_analysis → sonnet
  research_synthesis → opus / kimi
  vision/screenshot → kimi (seul avec vision pas cher)
  multi_step_planning → opus
```

**Economies attendues:** 40-85% vs model unique premium

---

## Structure Prompt Optimale (tous models)

```
1. System prompt STABLE (instructions, role)        ← CACHE HIT
2. Tool definitions (rarement change)                ← CACHE HIT
3. Knowledge base / contexte fixe                    ← CACHE HIT
--- CACHE BOUNDARY ---
4. Memories utilisateur (change entre sessions)      ← Variable
5. Historique conversation (change a chaque tour)    ← Variable
6. Message utilisateur                               ← Variable
```

---

## Comparaison Rapide

| | DeepSeek | Kimi | Claude Sonnet | Grok Fast |
|---|---------|------|---------------|-----------|
| **Prix input** | $0.28/M | $0.60/M | $3/M | $0.20/M |
| **Prix output** | $0.42/M | $2.50/M | $15/M | $0.60/M |
| **Cache** | 95% off | 75% off | 90% off | N/A |
| **Vision** | Non | Oui | Oui | Non |
| **Context** | 128K | 256K | 200K | 2M |
| **Tool use** | Bon | Excellent | Excellent | Bon |
| **Vitesse** | Rapide | Moyen | Moyen | Tres rapide |
