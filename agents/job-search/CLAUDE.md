# Job Search Agent

Agentic AI agent that searches for jobs on LinkedIn, Greenhouse, and Remotive,
evaluates them with Claude, and sends notifications via Discord or Gmail.

## Stack
- Runtime: Node.js + TypeScript (ES Modules, executed with `tsx`)
- AI: @anthropic-ai/sdk (claude-sonnet-4-20250514)
- MCP: @modelcontextprotocol/sdk
- HTTP/Scraping: axios, cheerio
- Notifications: Discord webhook, Gmail API

## Structure
This agent lives at agents/job-search/ within the monorepo.

sources/             # Source connectors (remotive.ts, ...)
agent.ts             # Agentic loop with tool use
agent.mock.ts        # Simulated client for development without tokens
run.ts               # Main orchestrator
mcp-server.ts        # MCP server for Claude Desktop integration
types.ts             # Agent-specific types (Job, SearchParams, AgentResult, etc.)

# Shared (relative to repo root, not this directory)
../../tools/         # Utilities (storage.ts, logger.ts)
../../notifications/ # Channels (discord.ts, email.ts)
../../types.ts       # Shared types: NotifySummary, SaveResult
../../data/          # jobs.json (gitignored)
../../logs/          # errors.log, agent.log (gitignored)

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

## Internal Job schema (see agents/job-search/types.ts)
{
  id:          string (URL),
  title:       string,
  company:     string,
  location:    string,
  modality:    "remote" | "hybrid" | "onsite",
  salary:      string | null,
  stack:       string[],
  description: string (max 800 chars),
  url:         string,
  source:      "remotive" | "greenhouse" | "linkedin" | "manual",
  publishedAt: string ISO,
  savedAt?:    string,
  seen?:       boolean,
  score?:      number   // added by the agent (0-10)
}

## Conventions
- Always use TypeScript (.ts), never .js source files
- Always use ES Modules (import/export), never require()
- Agent-specific types (Job, SearchParams, AgentResult, etc.) are defined in ./types.ts
- Shared types (NotifySummary, SaveResult) are in ../../types.ts
- try/catch on all network calls, log to logs/errors.log via logError()
- Do not throw global errors if a source fails; continue with the others
- Maximum 20 jobs per source, sorted by date descending

## Communication Style

- No greetings, no acknowledgments, no filler phrases ("Great question!", "I understand that...", "Sure!", etc.)
- Go directly to the solution or code.
- If something cannot be done, say so in one sentence and stop.
- No summaries at the end of responses unless explicitly asked.
- Prefer code over explanation unless explanation is requested.