# Job Search Agent — Monorepo

Agentic AI system that searches for jobs and evaluates them with Claude.

## Stack
- Runtime: Node.js + TypeScript (ES Modules, executed with `tsx`)
- AI: @anthropic-ai/sdk
- MCP: @modelcontextprotocol/sdk
- HTTP/Scraping: axios, cheerio
- Notifications: Discord webhook, Gmail API

## Structure
agents/                  # One subdirectory per agent
  job-search/            # Job search + evaluation agent
    sources/             # Source connectors (remotive.ts, ...)
    agent.ts             # Agentic loop with tool use
    agent.mock.ts        # Simulated client for dev without tokens
    run.ts               # Main orchestrator
    mcp-server.ts        # MCP server for Claude Desktop
    CLAUDE.md            # Agent-specific instructions
tools/                   # Shared utilities (storage.ts, logger.ts)
notifications/           # Shared channels (discord.ts, email.ts)
types.ts                 # Shared types: NotifySummary, SaveResult
data/                    # jobs.json (gitignored)
logs/                    # errors.log, agent.log (gitignored)
.claude/                 # Claude Code configuration

## Common commands
pnpm start -- --role "Senior Full-Stack Engineer" --stack "React,Node.js" --remote true
pnpm run test:connection
pnpm run test:remotive
pnpm run test:agent
pnpm run typecheck
pnpm run mcp

## Required environment variables (.env)
ANTHROPIC_API_KEY=
DISCORD_WEBHOOK_URL=
NOTIFICATION_EMAIL=
MCP_PORT=3000
GREENHOUSE_COMPANIES=stripe,shopify,notion,linear,vercel
NOTIFY=discord   # discord | email | both | none
AGENT_MODE=mock  # mock = no token spending | real = Claude API

## Conventions
- Always use TypeScript (.ts), never .js source files
- Always use ES Modules (import/export), never require()
- Shared types (NotifySummary, SaveResult) live in types.ts (root)
- Agent-specific types (Job, SearchParams, AgentResult, etc.) live in agents/<name>/types.ts
- try/catch on all network calls, log to logs/errors.log via logError()
- Do not throw global errors if a source fails; continue with the others
- Maximum 20 jobs per source, sorted by date descending
- tools/ and notifications/ are shared across all agents

## Communication Style

- No greetings, no acknowledgments, no filler phrases ("Great question!", "I understand that...", "Sure!", etc.)
- Go directly to the solution or code.
- If something cannot be done, say so in one sentence and stop.
- No summaries at the end of responses unless explicitly asked.
- Prefer code over explanation unless explanation is requested.
