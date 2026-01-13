import { Hono } from 'hono';
import { z } from 'zod';
import { SandboxService } from '../services/sandbox';
import type { Env, ExecuteRequest } from '../types';

const executeRouter = new Hono<{ Bindings: Env }>();

// Request validation schema
const executeRequestSchema = z.object({
  code: z.string().min(1).max(100000),
  language: z.enum(['javascript', 'typescript', 'python', 'bash']),
  timeout: z.number().min(1000).max(30000).optional(),
});

/**
 * POST /api/execute
 * Execute code in sandbox and return results
 */
executeRouter.post('/', async (c) => {
  // Validate request body
  const body = await c.req.json<ExecuteRequest>();
  const result = executeRequestSchema.safeParse(body);

  if (!result.success) {
    return c.json(
      {
        error: 'validation_error',
        message: 'Invalid request format',
        details: result.error.flatten(),
      },
      400,
    );
  }

  const { code, language, timeout } = result.data;

  // Execute code in sandbox
  const sandboxId = `exec-${Date.now()}`;
  const sandbox = new SandboxService(c.env, sandboxId);
  const executionResult = await sandbox.execute(code, language, { timeout });

  // Check for timeout
  if (executionResult.stderr.includes('timed out')) {
    return c.json(
      {
        error: 'timeout_error',
        message: 'Code execution timed out',
        ...executionResult,
      },
      408,
    );
  }

  return c.json(executionResult);
});

export { executeRouter };
