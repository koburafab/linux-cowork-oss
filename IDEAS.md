# IDEAS.md - Top 20 Feature Ideas for Linux AI Desktop / Computer Use App (2026)

> Recherche effectuee le 2026-04-01 sur Reddit, Hacker News, GitHub Trending, Product Hunt, et articles specialises.

---

## 1. Skill/Plugin System (SKILL.md)

**Feature:** Systeme de skills modulaires en Markdown (a la OpenClaw) -- chaque skill = un fichier SKILL.md avec instructions en langage naturel + scripts optionnels. Marketplace communautaire pour partager.

**Pourquoi c'est utile:** OpenClaw a explose a 190K+ stars grace a ca. Les users veulent etendre leur agent sans coder. 5400+ skills deja sur ClawHub couvrent email, browser, smart home, musique, etc.

**Difficulte:** Moyen -- le format SKILL.md est simple, mais il faut un registry, validation, sandboxing des scripts.

**Source:** [OpenClaw GitHub](https://github.com/openclaw/openclaw), [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills)

---

## 2. Voice Control Push-to-Talk Local

**Feature:** Controle vocal local (Whisper STT + Kokoro/Coqui TTS) avec mode push-to-talk via raccourci clavier. Pas d'always-listening, pas de cloud.

**Pourquoi c'est utile:** Hands-free quand on est dans un autre workflow. La latence locale est meilleure que le cloud (pas de 500ms-2s d'overhead API). Privacy totale.

**Difficulte:** Moyen -- Whisper + TTS existent deja, l'integration desktop + hotkey est le vrai travail.

**Source:** [Fazm Blog - LLM Desktop Agent Voice Local](https://fazm.ai/blog/llm-powered-desktop-agent-voice-local), [Hume AI - Voice Control](https://www.hume.ai/blog/controlling-your-computer-with-voice)

---

## 3. Sandboxed Execution (Bubblewrap/VM)

**Feature:** Chaque agent tourne dans un sandbox (bubblewrap pour le leger, VM pour le max). Filesystem binding selectif, network optionnel, pas d'acces SSH lateral.

**Pourquoi c'est utile:** Thread HN tres actif -- les gens veulent faire confiance a l'agent sans risquer leur systeme. Bubblewrap = bon compromis usability/securite. VM = foolproof.

**Difficulte:** Moyen -- bubblewrap est trivial, l'UX pour configurer les permissions est le challenge.

**Source:** [HN: Sandboxing AI Agents in Linux](https://news.ycombinator.com/item?id=46874139)

---

## 4. Smart File Organization + Auto-Tagging

**Feature:** Agent qui surveille ~/Downloads (et autres dossiers), classe automatiquement les fichiers, genere des tags semantiques, renomme intelligemment. Tags > dossiers rigides.

**Pourquoi c'est utile:** Pain point universel. AI File Sorter (open source) tourne en local avec Mistral/LLaMA. Les tags permettent de retrouver par recherche naturelle.

**Difficulte:** Facile -- watchdog sur dossier + LLM local pour classification. Le plus dur = ne pas etre intrusif.

**Source:** [AI File Sorter](https://sourceforge.net/projects/ai-file-sorter/), [n8n workflow template](https://n8n.io/workflows/2334-organise-your-local-file-directories-with-ai/)

---

## 5. Email Triage + Auto-Draft Local

**Feature:** Agent qui lit les emails (IMAP local), trie par priorite, genere des brouillons de reponse dans le ton de l'user, et schedule les envois. Tout local.

**Pourquoi c'est utile:** Les teams reportent 10-12h/semaine economisees avec l'email triage AI. OpenClaw Gmail skill = 14K downloads. C'est le use case #1 que les gens automatisent vraiment.

**Difficulte:** Moyen -- IMAP est standard, le challenge = matcher le ton de l'user + gerer les threads.

**Source:** [Lindy AI Email](https://www.lindy.ai/solutions/email), [OpenClaw GOG skill](https://www.growexx.com/blog/top-10-popular-openclaw-skills/)

---

## 6. Clipboard AI (Context-Aware)

**Feature:** Interception intelligente du clipboard -- quand on copie du texte, l'agent propose des actions contextuelles (traduire, resumer, reformuler, extraire data, corriger code).

**Pourquoi c'est utile:** ClipboardAI montre que c'est le workflow le plus naturel. Selectioner texte > action = zero friction. Marche dans n'importe quelle app.

**Difficulte:** Facile -- clipboard monitoring + LLM call. Sur X11 trivial, sur Wayland faut passer par le portal.

**Source:** [ClipboardAI](https://www.clipboard-ai.com), [UiPath Clipboard AI](https://www.uipath.com/product/clipboard-ai)

---

## 7. Wayland-Native Screen Understanding

**Feature:** Module de capture d'ecran et comprehension visuelle compatible Wayland natif (via XDG portal API), pas juste X11. OCR + VLM pour comprendre le contexte de l'app active.

**Pourquoi c'est utile:** Pain point #1 Linux en 2026. xdotool/wmctrl/AutoKey sont casses sur Wayland. Les agents qui ne marchent qu'en X11 perdent la moitie des users Linux modernes.

**Difficulte:** Dur -- Wayland security model bloque l'acces cross-app par design. Faut negocier avec le compositor via portals.

**Source:** [XDA - Wayland vs X11](https://www.xda-developers.com/reasons-linux-users-would-stick-with-x11/), [Arch Linux Forums](https://bbs.archlinux.org/viewtopic.php?id=298864)

---

## 8. Multi-Agent Orchestration Grid

**Feature:** Terminal/dashboard pour lancer et voir plusieurs agents en parallele. Grid layout, chaque agent change de couleur selon son etat (running/waiting/done). Un agent par tache.

**Pourquoi c'est utile:** Architect (HN Show) montre que les devs veulent voir tous leurs agents en un coup d'oeil. Un agent pour le build, un pour les tests, un pour le review -- en parallele.

**Difficulte:** Moyen -- la grid UI est simple, l'orchestration des workspaces isoles (worktrees) est le vrai travail.

**Source:** [HN: Architect Terminal](https://news.ycombinator.com/item?id=46703935)

---

## 9. Self-Evolving Skills (Capability Evolver)

**Feature:** L'agent apprend de ses taches passees et genere automatiquement de nouveaux skills. 3 modes: FIX (corriger un skill), DERIVED (adapter), CAPTURED (creer a partir d'un pattern observe).

**Pourquoi c'est utile:** Skill #1 sur ClawHub (35K downloads). Reduction de 46% du token usage car l'agent reutilise ses patterns au lieu de tout refaire from scratch.

**Difficulte:** Dur -- faut un systeme de memoire persistante + evaluation de qualite des skills generes.

**Source:** [OpenSpace Self-Evolving Skills](https://evoailabs.medium.com/self-evolving-agents-open-source-projects-redefining-ai-in-2026-be2c60513e97)

---

## 10. Smart Home Bridge (Home Assistant)

**Feature:** Integration Home Assistant via API -- l'agent desktop controle lumieres, thermostats, cameras, etc. Une seule conversation pour tout.

**Pourquoi c'est utile:** OpenClaw + Home Assistant supporte 2000+ protocoles (Zigbee, Matter, Thread). Le desktop agent devient le hub unifie pour tout -- travail ET maison.

**Difficulte:** Facile -- Home Assistant a une API REST solide. Le skill = wrapper autour de l'API.

**Source:** [OpenClaw Home Assistant Integration](https://eastondev.com/blog/en/posts/ai/20260205-openclaw-homeassistant/)

---

## 11. Cron Scheduler Natif

**Feature:** L'agent peut planifier ses propres taches recurrentes -- backup a 5h, check de deploy toutes les 5min, rapport quotidien. UI pour voir/gerer les crons.

**Pourquoi c'est utile:** Top 5 des skills OpenClaw les plus utilises. Sans ca, l'agent ne peut agir que quand l'user le demande. Avec, il devient proactif.

**Difficulte:** Facile -- cron existe deja, l'agent doit juste pouvoir creer/lister/supprimer des entries.

**Source:** [OpenClaw Skills - Cron Scheduler](https://help.apiyi.com/en/openclaw-skill-recommendations-2026-en.html)

---

## 12. Browser Automation Headless + Visual

**Feature:** Agent qui controle un browser (Playwright/Puppeteer) pour scraper, remplir des formulaires, naviguer. Mode headless pour l'automation, mode visible pour le debug.

**Pourquoi c'est utile:** TinyFish Web Agent = top 5 OpenClaw skills. Les gens automatisent: remplissage de formulaires admin, scraping de prix, monitoring de sites, tests de regression.

**Difficulte:** Moyen -- Playwright est mature, l'integration avec le LLM pour la navigation adaptive est le challenge.

**Source:** [Bytebot](https://github.com/bytebot-ai/bytebot), [Open Computer Use](https://github.com/coasty-ai/open-computer-use)

---

## 13. Multi-Model Runtime (BYOM)

**Feature:** Support de 50+ modeles (Claude, GPT, Gemini, Llama, Mistral, Qwen) + Ollama local. Switch de provider a runtime sans reconfiguration. L'user amene ses propres API keys.

**Pourquoi c'est utile:** OpenWork a 12K stars en grande partie grace a ca. Zero vendor lock-in. Local Ollama pour la privacy, cloud pour les taches lourdes.

**Difficulte:** Moyen -- abstraction unifiee sur les API providers. OpenRouter simplifie mais ajoute une dependance.

**Source:** [OpenWork](https://github.com/different-ai/openwork), [OpenWork Software](https://openwork.software/)

---

## 14. Containerized Desktop Environment

**Feature:** L'agent a son propre desktop Linux containerise (Docker) avec browser, file manager, apps. Isole du host. Scalable horizontalement.

**Pourquoi c'est utile:** Bytebot montre que ca marche. L'agent peut installer des apps, sauvegarder des fichiers, se logger sur des sites -- sans toucher au systeme host. Parfait pour les entreprises.

**Difficulte:** Moyen -- Docker + VNC/noVNC. Bytebot est Apache 2.0, forkable.

**Source:** [Bytebot](https://github.com/bytebot-ai/bytebot), [Bytebot Docs](https://docs.bytebot.ai/core-concepts/desktop-environment)

---

## 15. HUD / Status Bar Agent

**Feature:** Barre de statut ou overlay qui montre en temps reel: contexte actuel de l'agent, tokens utilises, taches en cours, provider actif, cout. Toujours visible.

**Pourquoi c'est utile:** Claude HUD montre que les devs veulent monitorer leur agent sans switcher de fenetre. Transparence sur le cout et l'activite.

**Difficulte:** Facile -- widget GTK/Qt ou tray icon. Le plus dur = l'integration avec le runtime agent.

**Source:** [Claude HUD](https://aitoolly.com/ai-news/article/2026-03-22-claude-hud-a-new-monitoring-plugin-for-claude-code-tracking-context-and-agent-activity)

---

## 16. Meeting Assistant Local

**Feature:** Transcription temps reel des meetings (Whisper local), extraction des action items, creation automatique des taches dans le task manager, envoi du resume aux participants.

**Pourquoi c'est utile:** Use case cite partout comme le plus concret. 15-20min de coordination eliminees par meeting. Le local = privacy pour les meetings sensibles.

**Difficulte:** Dur -- transcription temps reel + speaker diarization + extraction structuree. Whisper large necessite GPU.

**Source:** [Windows Forum - AI Productivity](https://windowsforum.com/threads/ai-productivity-use-cases-in-2026-workflow-automation-that-cuts-friction.408509/)

---

## 17. Nix Mode / Declarative Config

**Feature:** Configuration declarative de l'agent et de ses skills (a la Nix). Reproductible, versionnable, partageable. "Je veux cet agent avec ces skills dans cet etat."

**Pourquoi c'est utile:** Top 5 OpenClaw skills. Les power users Linux adorent le declaratif. Permet de partager des configs d'agent completes entre machines.

**Difficulte:** Moyen -- le format de config est simple, l'integration avec Nix/NixOS est le bonus.

**Source:** [OpenClaw Skills - Nix Mode](https://help.apiyi.com/en/openclaw-skill-recommendations-2026-en.html)

---

## 18. Password Manager Integration

**Feature:** Integration native avec 1Password/Bitwarden pour que l'agent puisse s'authentifier sur des sites/apps sans que les credentials soient exposes au LLM.

**Pourquoi c'est utile:** Bytebot l'a et c'est un differentiateur majeur. Sans ca, l'agent ne peut rien faire sur des sites authentifies. Les credentials passent par le password manager, jamais par le prompt.

**Difficulte:** Facile -- 1Password CLI et Bitwarden CLI existent. Le challenge = securite du flow.

**Source:** [Bytebot](https://github.com/bytebot-ai/bytebot)

---

## 19. Social Media Publisher

**Feature:** Agent qui publie sur X/Twitter, LinkedIn, etc. depuis le desktop. Scheduling, thread generation, analytics. Skill "X Articles" d'OpenClaw.

**Pourquoi c'est utile:** Top 5 skills OpenClaw. Les creators veulent automatiser la publication sans passer par 10 apps. Un prompt = un post formate et schedule.

**Difficulte:** Facile -- les APIs sociales sont standard. Le scheduling est un cron. Le vrai travail = qualite du contenu genere.

**Source:** [OpenClaw Skills - X Articles](https://help.apiyi.com/en/openclaw-skill-recommendations-2026-en.html)

---

## 20. WASM Agent Sandboxes (Agent OS)

**Feature:** Architecture micro-kernel ou chaque agent tourne dans un sandbox WASM isole avec ABI typee pour drawing, input, storage, networking. Un agent crash ne fait pas tomber le systeme.

**Pourquoi c'est utile:** Show HN "Pure AI OS" montre que c'est la prochaine frontiere. Isolation maximale + performance native. Chaque skill = un module WASM portable.

**Difficulte:** Dur -- architecture system-level, WASM runtime (Wasmtime/Wasmer), ABI design. Projet long terme.

**Source:** [HN: Pure AI OS](https://news.ycombinator.com/item?id=47557165)

---

## Resume par difficulte

### Facile (6)
- Smart File Organization + Auto-Tagging
- Clipboard AI (Context-Aware)
- Smart Home Bridge (Home Assistant)
- Cron Scheduler Natif
- HUD / Status Bar Agent
- Password Manager Integration

### Moyen (9)
- Skill/Plugin System (SKILL.md)
- Voice Control Push-to-Talk Local
- Sandboxed Execution (Bubblewrap/VM)
- Email Triage + Auto-Draft Local
- Multi-Agent Orchestration Grid
- Browser Automation Headless + Visual
- Multi-Model Runtime (BYOM)
- Containerized Desktop Environment
- Nix Mode / Declarative Config

### Dur (4)
- Wayland-Native Screen Understanding
- Self-Evolving Skills (Capability Evolver)
- Meeting Assistant Local
- WASM Agent Sandboxes (Agent OS)

### Facile (1 - bonus social)
- Social Media Publisher

---

## Tendances cles 2026

1. **Local-first, privacy-first** -- tout le monde veut que ca tourne sur sa machine
2. **Skills > Code** -- les users veulent etendre via Markdown/config, pas via du code
3. **Wayland = le mur Linux** -- le pain point #1 pour le computer use sur Linux
4. **Multi-model = table stakes** -- personne ne veut etre locke sur un seul provider
5. **Proactivite** -- l'agent doit agir sans qu'on lui demande (cron, watchers, triggers)
6. **Transparence** -- HUD, cout visible, audit trail, l'user veut savoir ce que fait l'agent
