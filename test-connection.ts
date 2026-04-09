import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const TARGET_STRING = 'CONEXIÓN_OK';

async function testConnection(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set in .env');
    process.exit(1);
  }

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32,
      messages: [
        {
          role: 'user',
          content: `Reply only with the word: ${TARGET_STRING}`,
        },
      ],
    });

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    if (responseText.includes(TARGET_STRING)) {
      console.log(`✅ Successful connection to Claude API`);
      console.log(`   Model   : ${message.model}`);
      console.log(`   Response: ${responseText.trim()}`);
    } else {
      console.error(`❌ Unexpected response: "${responseText}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Error connecting to Claude API: ${(err as Error).message}`);
    process.exit(1);
  }
}

testConnection();
