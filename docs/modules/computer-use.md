# Module: Computer Use

> Comment Claude Code controle le desktop — reference pour implementer le computer use Linux

## Vue d'ensemble

Le computer use permet a l'IA de voir l'ecran, cliquer, taper au clavier, et controler les applications. C'est le differenciateur principal de Cowork par rapport aux clones.

## Architecture (3 couches)

```
┌─────────────────────────────────────┐
│  MCP Server Layer                    │
│  (expose les outils via MCP)         │
├─────────────────────────────────────┤
│  Executor Layer (TypeScript)         │
│  (screenshot, mouse, keyboard, apps) │
├─────────────────────────────────────┤
│  Native Modules                      │
│  @ant/computer-use-swift (macOS)     │
│  @ant/computer-use-input (Rust/enigo)│
└─────────────────────────────────────┘
```

## 1. Screenshot Capture

### Implementation Anthropic (macOS)
- Utilise Swift `SCContentFilter` pour capture securisee
- Qualite JPEG 0.75
- Pre-dimensionne avant envoi a l'API (evite resize serveur)
- Exclut la fenetre terminal (anti-photobombing)
- Necessite `drainRunLoop()` car methode `@MainActor`

### Adaptation Linux
- **scrot** ou **grim** (Wayland) pour capture d'ecran
- **xdotool** pour identifier les fenetres actives
- **ImageMagick** pour redimensionner/compresser
- Filtrage fenetres par PID/class pour exclure le terminal

```bash
# Equivalent Linux
scrot --focused -q 75 /tmp/screenshot.jpg
# ou pour Wayland
grim -g "$(slurp)" /tmp/screenshot.jpg
```

## 2. Controle Souris

### Implementation Anthropic
- **Mouvement**: ease-out-cubic a 60fps, 2000px/sec, cap 0.5s
- **Clic**: simple/double/triple, avec modifiers (cmd, shift, ctrl)
- **Drag**: animation ease-out-cubic, button release en `finally`
- **Settle delay**: 50ms apres mouvement (HID round-trip)

### Adaptation Linux
```bash
# xdotool equivalents
xdotool mousemove --sync 500 300        # move
xdotool click 1                          # left click
xdotool click --repeat 2 --delay 50 1   # double click
xdotool mousedown 1 mousemove 600 400 mouseup 1  # drag
```

- **ydotool** pour Wayland (alternative a xdotool)
- **python-xlib** pour controle plus fin

## 3. Controle Clavier

### Implementation Anthropic
- Syntaxe xdotool: `"ctrl+shift+a"` → split sur `+`
- 8ms entre repetitions (125Hz USB polling)
- Handling special Escape (punch hole dans CGEventTap)
- **Clipboard paste** pour texte long: save clipboard → write → Cmd+V → restore

### Adaptation Linux
```bash
# xdotool equivalents
xdotool key ctrl+shift+a                # key combo
xdotool type "Hello World"              # typing
xdotool key --repeat 5 --delay 8 Return # repeated keys

# Clipboard paste (equivalent)
echo "text" | xclip -selection clipboard
xdotool key ctrl+v
```

## 4. Gestion Applications

### Implementation Anthropic
- Cache/montre les apps non-cibles via NSWorkspace
- Filtre les apps systeme, helpers, services
- Protection prompt-injection: allowlist caracteres Unicode `[\p{L}\p{M}\p{N}_ .&'()+-]+`
- Cap: 40 chars/nom, 50 apps max dans description

### Adaptation Linux
```bash
# Lister les fenetres
wmctrl -l                               # liste toutes les fenetres
xdotool search --name "Firefox"         # chercher par nom
xdotool getactivewindow                 # fenetre active

# Cacher/montrer
xdotool windowminimize <window_id>      # cacher
xdotool windowactivate <window_id>      # montrer
wmctrl -i -r <window_id> -b add,hidden  # cacher via wmctrl
```

## 5. Systeme de Verrou (Lock)

### Implementation Anthropic
- Fichier lock: `~/.claude/computer-use.lock`
- Creation atomique `O_EXCL` (prevent race conditions)
- Contenu: `sessionId`, `pid`, `acquiredAt`
- Recovery auto si PID mort (stale lock)
- 3 etats: `acquired`, `blocked`, `free`

### Ce qu'on garde
Le meme pattern de file-based lock fonctionne sur Linux. Pas besoin de changer.

## 6. Permissions

### Implementation Anthropic
- Dialog React pour approbation utilisateur
- Feature flags par session: `clipboardRead`, `clipboardWrite`, `systemKeyCombos`
- Apps autorisees stockees dans AppState

### Adaptation Linux
- Dialog GTK/Qt ou notification desktop
- Meme granularite de permissions
- Integration avec PolicyKit pour elevation si necessaire

## 7. Coordonnees et Vision

### Modes de coordonnees
- `pixels` — coordonnees brutes
- `normalized` — coordonnees 0-1 (independant de la resolution)

### Calcul dimensions
```
logical × scaleFactor = physical → resize to API target
```

### Pour Linux
- `xdpyinfo` pour resolution et DPI
- `xrandr` pour multi-ecran
- Meme logique de normalisation

## 8. Integration MCP

Le computer use est expose comme un serveur MCP in-process:
- Outils prefixes `mcp__computer-use__*`
- Transport stdio (pas subprocess spawne)
- Description inclut les apps installees (enumeration async, timeout 1s)

## 9. Securite et Hardening

| Menace | Protection Anthropic | Equivalent Linux |
|--------|---------------------|------------------|
| Prompt injection via noms d'apps | Character allowlist Unicode | Meme filtrage |
| Escape synthetise par le modele | CGEventTap interception | xdotool guard |
| Clipboard poisoning | Read-back verification | Meme pattern avec xclip |
| Sessions concurrentes | File-based lock O_EXCL | Identique |
| Apps cachees malveillantes | Hide non-target apps | wmctrl minimize |

## 10. Fichiers Source Reference

```
computerUse/
├── appNames.ts              # Filtrage noms d'apps
├── cleanup.ts               # Nettoyage fin de tour
├── common.ts                # Constantes (MCP server name, capabilities)
├── computerUseLock.ts       # Verrou fichier avec recovery PID
├── drainRunLoop.ts          # Pump CFRunLoop (macOS-specific, pas besoin Linux)
├── escHotkey.ts             # Interception Escape (CGEventTap → a remplacer)
├── executor.ts              # Executeur principal (mouse, keyboard, screenshots)
├── gates.ts                 # Feature gates (GrowthBook)
├── hostAdapter.ts           # Wrapper executor + permissions + logging
├── inputLoader.ts           # Lazy-load @ant/computer-use-input
├── mcpServer.ts             # Serveur MCP + entrypoint subprocess
├── setup.ts                 # Setup outils (MCP config + allowed tools)
├── swiftLoader.ts           # Lazy-load @ant/computer-use-swift (macOS-only)
├── toolRendering.tsx         # Rendering React pour outils CU
└── wrapper.tsx              # Override tool call + session context
```

## Points Cles pour Implementation Linux

1. **Remplacer Swift par xdotool/scrot/wmctrl** — c'est le gros du travail
2. **Garder l'architecture MCP** — protocol standard, pas besoin de reinventer
3. **Garder le file-based lock** — fonctionne identiquement
4. **Adapter le Escape hotkey** — utiliser xbindkeys ou keybinding daemon
5. **Support Wayland** — ydotool + grim au lieu de xdotool + scrot
6. **Le drainRunLoop n'existe pas sur Linux** — c'est un workaround macOS CFRunLoop
