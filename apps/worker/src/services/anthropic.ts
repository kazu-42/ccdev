import Anthropic from '@anthropic-ai/sdk';
import type { Message, SSEEvent } from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// Tool definitions for Claude
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'execute_code',
    description: 'Execute code in a sandboxed environment. Use this to run and test code.',
    input_schema: {
      type: 'object' as const,
      properties: {
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'python'],
          description: 'The programming language of the code',
        },
        code: {
          type: 'string',
          description: 'The code to execute',
        },
      },
      required: ['language', 'code'],
    },
  },
];

export class AnthropicService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *createMessageStream(
    messages: Message[],
    model: string = DEFAULT_MODEL
  ): AsyncGenerator<SSEEvent> {
    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const stream = this.client.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      messages: anthropicMessages,
      tools: TOOLS,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          yield {
            event: 'message',
            data: { content: delta.text },
          };
        }
      } else if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          yield {
            event: 'tool_use',
            data: {
              id: block.id,
              name: block.name,
              input: {},
            },
          };
        }
      } else if (event.type === 'message_stop') {
        yield {
          event: 'done',
          data: {},
        };
      }
    }
  }

  async createMessage(
    messages: Message[],
    model: string = DEFAULT_MODEL
  ): Promise<Anthropic.Message> {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return this.client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: anthropicMessages,
      tools: TOOLS,
    });
  }
}
