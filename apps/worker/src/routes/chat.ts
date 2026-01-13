import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, SSEEvent } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { SandboxService } from '../services/sandbox';

const chatRouter = new Hono<{ Bindings: Env }>();

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 10;

// Tool definitions
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'execute_code',
    description:
      'Execute code in a sandboxed environment. Use this to run JavaScript, TypeScript, Python code or shell commands.',
    input_schema: {
      type: 'object' as const,
      properties: {
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'python', 'bash'],
          description: 'The programming language or shell',
        },
        code: {
          type: 'string',
          description: 'The code to execute',
        },
      },
      required: ['language', 'code'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the sandbox filesystem',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the sandbox filesystem',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path to write to',
        },
        content: {
          type: 'string',
          description: 'The content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories in a given path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list (default: current directory)',
        },
      },
      required: [],
    },
  },
];

// Request validation schema
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.union([
        z.string().min(1),
        z.array(z.any()), // Allow content blocks
      ]),
    })
  ),
  model: z.string().optional(),
  yolo: z.boolean().optional(), // Auto-approve tool calls
});

/**
 * Execute a tool and return the result
 */
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  sandbox: SandboxService
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (name) {
      case 'execute_code': {
        const language = input.language as string;
        const code = input.code as string;

        // Map language to sandbox-compatible format
        let lang: 'javascript' | 'typescript' | 'python' | 'bash' = 'javascript';
        if (language === 'typescript') lang = 'typescript';
        else if (language === 'python') lang = 'python';
        else if (language === 'bash') lang = 'bash';

        const result = await sandbox.execute(code, lang, { timeout: 30000 });
        const output = result.stdout || '';
        const error = result.stderr || '';

        if (error && !output) {
          return { result: `Error:\n${error}`, isError: true };
        }
        return {
          result: output + (error ? `\nStderr:\n${error}` : ''),
          isError: false,
        };
      }

      case 'read_file': {
        const path = input.path as string;
        try {
          const content = await sandbox.readFile(path);
          return { result: content, isError: false };
        } catch (err) {
          return { result: `Error reading file: ${(err as Error).message}`, isError: true };
        }
      }

      case 'write_file': {
        const path = input.path as string;
        const content = input.content as string;
        try {
          // Ensure parent directory exists
          const dir = path.split('/').slice(0, -1).join('/');
          if (dir) {
            await sandbox.mkdir(dir);
          }
          await sandbox.writeFile(path, content);
          return { result: `Successfully wrote to ${path}`, isError: false };
        } catch (err) {
          return { result: `Error writing file: ${(err as Error).message}`, isError: true };
        }
      }

      case 'list_files': {
        const path = (input.path as string) || '.';
        try {
          const files = await sandbox.listFiles(path);
          const formatted = files
            .map((f) => `${f.type === 'directory' ? 'd' : '-'} ${f.name}${f.size ? ` (${f.size} bytes)` : ''}`)
            .join('\n');
          return { result: formatted || '(empty directory)', isError: false };
        } catch (err) {
          return { result: `Error listing files: ${(err as Error).message}`, isError: true };
        }
      }

      default:
        return { result: `Unknown tool: ${name}`, isError: true };
    }
  } catch (error) {
    const err = error as Error;
    return { result: `Tool execution failed: ${err.message}`, isError: true };
  }
}

/**
 * Format SSE event
 */
function formatSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * POST /api/chat
 * Stream AI responses with tool use support
 */
chatRouter.post('/', async (c) => {
  const body = await c.req.json();
  const result = chatRequestSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: 'validation_error',
        message: 'Invalid request format',
        details: result.error.flatten(),
      },
      400
    );
  }

  const { messages, model = DEFAULT_MODEL } = result.data;

  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json(
      {
        error: 'configuration_error',
        message: 'ANTHROPIC_API_KEY is not configured',
      },
      500
    );
  }

  const encoder = new TextEncoder();
  const client = new Anthropic({ apiKey });
  // Initialize SandboxService with env for real Sandbox SDK integration
  const sandboxId = `chat-${Date.now()}`;
  const sandbox = new SandboxService(c.env, sandboxId);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Convert messages to Anthropic format
        let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let iterations = 0;

        // Agentic loop - continue until no more tool calls
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const response = await client.messages.create({
            model,
            max_tokens: MAX_TOKENS,
            messages: currentMessages,
            tools: TOOLS,
            system: `You are Claude Code, an AI assistant that helps users write and execute code. You have access to a sandboxed environment where you can:
- Execute JavaScript, TypeScript, Python code, and shell commands
- Read and write files
- List directory contents

When the user asks you to write or run code, use the appropriate tools. Be concise but helpful.
Current working directory: /home/sandbox`,
          });

          // Process response content blocks
          interface ToolUseBlock {
            type: 'tool_use';
            id: string;
            name: string;
            input: Record<string, unknown>;
          }
          const toolUses: ToolUseBlock[] = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              // Stream text content
              controller.enqueue(
                encoder.encode(
                  formatSSE({
                    event: 'message',
                    data: { content: block.text },
                  })
                )
              );
            } else if (block.type === 'tool_use') {
              toolUses.push({
                type: 'tool_use',
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              });

              // Send tool_use event to frontend
              controller.enqueue(
                encoder.encode(
                  formatSSE({
                    event: 'tool_use',
                    data: {
                      id: block.id,
                      name: block.name,
                      input: block.input,
                    },
                  })
                )
              );
            }
          }

          // If no tool calls or stop_reason is end_turn, we're done
          if (toolUses.length === 0 || response.stop_reason === 'end_turn') {
            controller.enqueue(encoder.encode(formatSSE({ event: 'done', data: {} })));
            break;
          }

          // Execute tools and collect results
          interface ToolResultBlock {
            type: 'tool_result';
            tool_use_id: string;
            content: string;
            is_error?: boolean;
          }
          const toolResults: ToolResultBlock[] = [];

          for (const toolUse of toolUses) {
            const { result: toolResult, isError } = await executeTool(
              toolUse.name,
              toolUse.input,
              sandbox
            );

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult,
              is_error: isError,
            });

            // Send tool_result event to frontend
            controller.enqueue(
              encoder.encode(
                formatSSE({
                  event: 'tool_result',
                  data: {
                    tool_use_id: toolUse.id,
                    content: toolResult,
                    is_error: isError,
                  },
                })
              )
            );
          }

          // Add assistant response and tool results to messages for next iteration
          currentMessages = [
            ...currentMessages,
            {
              role: 'assistant',
              content: response.content,
            },
            {
              role: 'user',
              content: toolResults.map((r) => ({
                type: 'tool_result' as const,
                tool_use_id: r.tool_use_id,
                content: r.content,
                is_error: r.is_error,
              })),
            },
          ];
        }

        // If we hit max iterations, send a warning
        if (iterations >= MAX_TOOL_ITERATIONS) {
          controller.enqueue(
            encoder.encode(
              formatSSE({
                event: 'message',
                data: {
                  content: '\n\n[Max tool iterations reached. Please continue if needed.]',
                },
              })
            )
          );
          controller.enqueue(encoder.encode(formatSSE({ event: 'done', data: {} })));
        }
      } catch (error) {
        const err = error as Error;
        controller.enqueue(
          encoder.encode(
            formatSSE({
              event: 'error',
              data: { message: err.message },
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

export { chatRouter };
