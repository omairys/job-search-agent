# Job Search Agent

Agentic AI agent that searches for jobs on LinkedIn, Greenhouse, and Remotive,
evaluates them with Claude, and sends notifications via Discord or Gmail.

## Stack
- Runtime: Node.js ES Modules ("type": "module")
- AI: @anthropic-ai/sdk (claude-sonnet-4-20250514)
- MCP: @modelcontextprotocol/sdk
- HTTP/Scraping: axios, cheerio
- Notifications: Discord webhook, Gmail API

## Structure
sources/       # Connectors per source (remotive.js, greenhouse.js, linkedin.js)
tools/         # Utilities (storage.js)
notifications/ # Channels (discord.js, email.js)
data/          # jobs.json (gitignored)
logs/          # errors.log, agent.log (gitignored)
.claude/       # Claude Code configuration

## Common commands
node run.js --role "Senior Full-Stack Engineer" --stack "React,Node.js" --remote true
node test-connection.js
node mcp-server.js
node sources/test-remotive.js
node sources/test-greenhouse.js

## Required environment variables (.env)
ANTHROPIC_API_KEY=
DISCORD_WEBHOOK_URL=
NOTIFICATION_EMAIL=
MCP_PORT=3000
GREENHOUSE_COMPANIES=stripe,shopify,notion,linear,vercel
NOTIFY=discord   # discord | email | both | none

## Internal Job schema
{
  id: string (URL),
  title: string,
  company: string,
  location: string,
  modality: "remote" | "hybrid" | "onsite",
  salary: string | null,
  stack: string[],
  description: string (max 800 chars),
  url: string,
  source: "remotive" | "greenhouse" | "linkedin",
  publishedAt: string ISO
}

## Conventions
- Always use ES Modules (import/export), never require()
- try/catch on all network calls, log to logs/errors.log
- Do not throw global errors if a source fails; continue with the others
- Maximum 20 jobs per source, sorted by date descending
