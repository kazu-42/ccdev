import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env } from './types';
import { corsMiddleware } from './middleware/cors';
import { errorMiddleware } from './middleware/error';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', corsMiddleware);
app.use('*', errorMiddleware);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// API routes
app.route('/api/chat', chatRouter);
app.route('/api/execute', executeRouter);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'not_found',
      message: `Route ${c.req.path} not found`,
    },
    404
  );
});

export default app;
