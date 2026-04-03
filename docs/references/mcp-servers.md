# Top MCP Servers — Reference for Linux Cowork OSS

## Essentiels (installer en premier)

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 1 | Filesystem | `@modelcontextprotocol/server-filesystem /home` | Acces fichiers locaux |
| 2 | GitHub | `@modelcontextprotocol/server-github` | Repos, issues, PRs |
| 3 | SQLite | `@modelcontextprotocol/server-sqlite` | Requetes DB locales |
| 4 | Brave Search | `@anthropic/brave-search-mcp` | Recherche web privee |
| 5 | Desktop Commander | `desktop-commander` | Terminal + processus |
| 6 | YouTube Transcript | `@kimtaeyoon83/mcp-server-youtube-transcript` | Sous-titres videos |

## Developement

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 7 | Git | `git-mcp-server` | Clone, commit, push, diff |
| 8 | Docker | `docker-mcp-server` | Containers, images, compose |
| 9 | Context7 | `context7-mcp` | Docs versionnees 7000+ libs |
| 10 | npm Search | `npm-search-mcp-server` | Recherche packages |
| 11 | Sentry | `sentry-mcp-server` | Error tracking |

## Browser & Web

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 12 | Playwright | `@playwright/mcp` | Automatisation browser |
| 13 | Puppeteer | `@modelcontextprotocol/server-puppeteer` | Chromium headless |
| 14 | Fetch | `mcp-fetch-server` | Recuperer contenu web |
| 15 | Firecrawl | `firecrawl-mcp-server` | Scraping + extraction |
| 16 | Exa Search | `exa-mcp-server` | Recherche semantique |
| 17 | Tavily | `tavily-mcp` | Search structure |

## Productivite

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 18 | Slack | `slack-mcp-server` | Messages, channels |
| 19 | Notion | `@notionhq/notion-mcp-server` | Pages, DB Notion |
| 20 | Google Workspace | `google-workspace-mcp` | Gmail, Calendar, Docs, Drive |
| 21 | Jira | `@mcp-devtools/jira` | Issues, projets |
| 22 | Linear | `@mcp-devtools/linear` | Issue tracking |

## Databases

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 23 | PostgreSQL | `@modelcontextprotocol/server-postgres` | Requetes Postgres |
| 24 | MongoDB | `@mongodb/mcp-server` | MongoDB Atlas + local |
| 25 | Chroma | `chroma-mcp-server` | Vector DB + embeddings |

## AI & Reasoning

| # | Serveur | Package NPM | Description |
|---|---------|-------------|-------------|
| 26 | Sequential Thinking | `@modelcontextprotocol/server-sequential-thinking` | Raisonnement step-by-step |
| 27 | Memory | `@modelcontextprotocol/server-memory` | Knowledge graphs persistants |

## Config rapide pour ~/.config/linux-cowork/mcp-servers.json

```json
{
  "servers": [
    { "name": "youtube-transcript", "command": "npx", "args": ["-y", "@kimtaeyoon83/mcp-server-youtube-transcript"] },
    { "name": "filesystem", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home"] },
    { "name": "fetch", "command": "npx", "args": ["-y", "mcp-fetch-server"] },
    { "name": "sequential-thinking", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"] },
    { "name": "memory", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] }
  ]
}
```
