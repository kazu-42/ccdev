import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, ChatRequest, SSEEvent } from '../types';
import { AnthropicService } from '../services/anthropic';

const chatRouter = new Hono<{ Bindings: Env }>();

// Request validation schema
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ),
  model: z.string().optional(),
});

/**
 * POST /api/chat
 * Stream AI responses using Server-Sent Events
 */
chatRouter.post('/', async (c) => {
  // Validate request body
  const body = await c.req.json<ChatRequest>();
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

  const { messages, model } = result.data;

  // Check for API key
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

  // Create SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const anthropic = new AnthropicService(apiKey);

      try {
        for await (const event of anthropic.createMessageStream(messages, model)) {
          const sseData = formatSSE(event);
          controller.enqueue(encoder.encode(sseData));
        }
      } catch (error) {
        const err = error as Error;
        const errorEvent: SSEEvent = {
          event: 'error',
          data: { message: err.message },
        };
        controller.enqueue(encoder.encode(formatSSE(errorEvent)));
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

/**
 * Format SSE event
 */
function formatSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export { chatRouter };
