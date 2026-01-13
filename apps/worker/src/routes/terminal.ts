import { Hono } from 'hono';
import type { Env } from '../types';

export const terminalRouter = new Hono<{ Bindings: Env }>();

// WebSocket upgrade endpoint
terminalRouter.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  if (!sessionId) {
    return c.json({ error: 'Session ID required' }, 400);
  }

  // Check for WebSocket upgrade
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'WebSocket upgrade required' }, 426);
  }

  // Get Durable Object instance
  const id = c.env.TERMINAL_SESSION.idFromName(sessionId);
  const stub = c.env.TERMINAL_SESSION.get(id);

  // Forward request to Durable Object
  const url = new URL(c.req.url);
  url.pathname = '/ws';

  return stub.fetch(
    new Request(url.toString(), {
      headers: c.req.raw.headers,
    }),
  );
});

// Get session info (for future use)
terminalRouter.get('/:sessionId/info', async (c) => {
  const sessionId = c.req.param('sessionId');

  return c.json({
    sessionId,
    status: 'active',
  });
});
