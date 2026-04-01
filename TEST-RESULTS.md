# Linux Cowork OSS - E2E Test Results

**Date:** 2026-04-01
**Backend:** localhost:3001
**LLM Provider:** DeepSeek (deepseek-chat)

## Results Summary

| # | Test | Result | Response Time | Notes |
|---|------|--------|--------------|-------|
| 1 | Chat simple (bonjour) | PASS | 2.1s | Streaming SSE correct. Reponse: "Bonjour ! Comment allez-vous aujourd'hui ?" |
| 2 | Chat technique (2+2) | PASS | 2.0s | Streaming SSE correct. Reponse: "4" (une seule word, correct) |
| 3 | Screenshot | PASS | 1.3s | ok: True, base64 size: 158728 chars |
| 4 | Autonome file-ops (whoami) | PASS | 5.7s | Tool bash appele avec `whoami`, resultat: `alpinotv` |
| 5 | Autonome computer-use (screenshot+describe) | PASS | 4.4s | Tool screenshot appele, screenshot pris. Lock systeme fonctionne (empeche appels concurrents) |
| 6 | Settings | PASS | 0.02s | model: deepseek-chat, key_set: True |
| 7 | Status | PASS | 0.006s | initialized: true, activeModel present, settings complets |
| 8 | List windows | PASS | 0.009s | ok: true, windows: [] (aucune fenetre trackee) |

## Score: 8/8 PASS

## Details par test

### Test 1 - Chat simple
```
curl -s -X POST http://localhost:3001/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"Dis moi bonjour en francais"}'
```
- Format: SSE (Server-Sent Events) avec `data: {"type":"text","content":"..."}` par token
- Fin propre avec `data: {"type":"done"}`
- Contenu en francais comme demande

### Test 2 - Chat technique
```
curl -s -X POST http://localhost:3001/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"What is 2+2? Answer in one word."}'
```
- Reponse correcte: "4"
- Instruction "one word" respectee

### Test 3 - Screenshot
```
curl -s -X POST http://localhost:3001/api/computer-use/screenshot -H 'Content-Type: application/json' -d '{}'
```
- Image JPEG en base64, ~158KB
- API repond ok: True

### Test 4 - Mode autonome (file-ops)
```
curl -s -m 30 -X POST http://localhost:3001/api/autonomous -H 'Content-Type: application/json' \
  -d '{"task":"Run the command whoami and tell me the result","mode":"file-ops","timeoutMs":20000}'
```
- L'agent a appele le tool `bash` avec la commande `whoami`
- Resultat: `alpinotv` (correct)
- L'agent a formule une reponse complete

### Test 5 - Mode autonome (computer-use)
```
curl -s -m 30 -X POST http://localhost:3001/api/autonomous -H 'Content-Type: application/json' \
  -d '{"task":"Take a screenshot and describe what applications are visible","mode":"computer-use","timeoutMs":20000}'
```
- L'agent a appele le tool `screenshot` avec mode fullscreen
- Screenshot pris et retourne en base64
- Systeme de lock fonctionne (empeche les appels concurrents computer-use)

### Test 6 - Settings
```
curl -s http://localhost:3001/api/settings
```
- activeModel: deepseek-chat
- Cle DeepSeek configuree: oui
- Autres cles (moonshot, anthropic, openrouter): vides

### Test 7 - Status
```
curl -s http://localhost:3001/api/status
```
- initialized: true
- Config complete avec theme dark, maxTokens 4096, temperature 0.7

### Test 8 - List windows
```
curl -s http://localhost:3001/api/computer-use/windows
```
- ok: true
- Liste vide (normal si aucune fenetre n'est trackee activement)

## Observations
- Le streaming SSE fonctionne parfaitement pour chat et autonome
- Les tool calls en mode autonome sont correctement executes et les resultats retournes dans le stream
- Le systeme de lock pour computer-use empeche les sessions concurrentes (bon comportement)
- Temps de reponse excellents: <0.02s pour les endpoints statiques, 2-6s pour les appels LLM
- Le backend DeepSeek repond de facon coherente et rapide
