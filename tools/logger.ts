import { appendFileSync, mkdirSync } from 'fs';

export function logError(source: string, error: Error): void {
  mkdirSync('logs', { recursive: true });
  const entry = `[${new Date().toISOString()}] [${source}] ${error.message}\n`;
  appendFileSync('logs/errors.log', entry);
  console.error(`❌ [${source}]`, error.message);
}

export function logAgentTool(toolName: string, input: unknown, result: unknown): void {
  mkdirSync('logs', { recursive: true });
  const entry = JSON.stringify({
    ts:     new Date().toISOString(),
    tool:   toolName,
    input,
    result
  }) + '\n';
  appendFileSync('logs/agent.log', entry);
}
