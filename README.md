# Job Search Agent 🤖

Agentic Node.js + TypeScript agent that searches for job postings from multiple sources,
evaluates them with Claude using tool use, saves the relevant ones, and notifies
via Discord.

## Stack
- Node.js + TypeScript (ES Modules, executed with `tsx`) + @anthropic-ai/sdk
- Sources: Remotive API, LinkedIn scraping (cheerio) — JA-004 pending
- Notifications: Discord Webhook
- Persistence: Local JSON in `data/jobs.json`

## Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure `.env`
Copy `.env.example` and fill in:
```env
ANTHROPIC_API_KEY=sk-ant-...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NOTIFY=discord          # discord | email | both | none
AGENT_MODE=mock         # mock = no token spending | real = Claude API
GREENHOUSE_COMPANIES=stripe,shopify,notion,linear,vercel
```

### 3. Create a Discord Webhook
1. Open your Discord server → Settings → Integrations → Webhooks
2. "New Webhook" → give it a name and channel → "Copy Webhook URL"
3. Paste it in `DISCORD_WEBHOOK_URL` in your `.env`

## Usage

```bash
# Mock mode (no token spending, ideal for development)
AGENT_MODE=mock pnpm start

# Real search with Claude API
pnpm start -- --role "Frontend Engineer" --location "Remote" --min-score 7

# Custom search
pnpm start -- --role "Staff Engineer" --location "LATAM" --min-score 8 --limit 15

# No notifications
NOTIFY=none pnpm start -- --role "Backend Engineer"
```

## Individual tests

```bash
# Verify Claude API connection
pnpm run test:connection

# Test agent in mock mode
pnpm run test:agent

# Test Remotive source
pnpm run test:remotive

# Test Discord notification
pnpm run test:discord

# Test storage
pnpm run test:storage

# Type check
pnpm run typecheck
```

## Project structure

```
agents/
  job-search/
    sources/       # Source connectors (remotive.ts, ...)
    agent.ts       # Agentic loop with tool use
    agent.mock.ts  # Simulated client for development without tokens
    run.ts         # Main orchestrator
    mcp-server.ts  # MCP server for Claude Desktop integration
tools/             # Shared utilities (storage.ts, logger.ts)
notifications/     # Shared channels (discord.ts, email.ts)
types.ts           # Shared TypeScript types (Job, SearchParams, etc.)
data/              # jobs.json (gitignored)
logs/              # errors.log, agent.log (gitignored)
```

## Claude Desktop Integration (MCP)

This agent exposes its tools as an MCP server compatible with
Claude Desktop.

### Configuration

Add this to your `claude_desktop_config.json`
(on macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "job-search-agent": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/job-search-agent/agents/job-search/mcp-server.ts"]
    }
  }
}
```

> Use the absolute path to the project. After editing the file,
> restart Claude Desktop.

### Tools available from Claude Desktop

| Tool | Description |
|------|-------------|
| `search_jobs` | Runs the full pipeline and returns relevant jobs |
| `evaluate_job` | Evaluates a single job with Claude |
| `list_saved_jobs` | Returns saved jobs not yet seen |
| `notify` | Sends notification via Discord and/or email |

### Run the server manually

```bash
pnpm run mcp
```

The server uses stdio — Claude Desktop launches it automatically.

## Roadmap
- [ ] JA-003 — Source: Greenhouse API
- [ ] JA-004 — Source: LinkedIn scraping
- [ ] JA-008 — Gmail notification
