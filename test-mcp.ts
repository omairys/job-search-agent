import { Client }               from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'tsx',
  args:    ['./mcp-server.ts'],
});

const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

// 1. List available tools
const { tools } = await client.listTools();
console.log('🔧 Available tools:', tools.map(t => t.name));

// 2. Smoke test: list saved jobs (no tokens spent)
const result = await client.callTool({
  name:      'list_saved_jobs',
  arguments: {},
});
const text = (result.content as { text: string }[])[0].text;
console.log('📋 list_saved_jobs:', text.slice(0, 200) + '...');

console.log('✅ MCP test complete');
await client.close();
