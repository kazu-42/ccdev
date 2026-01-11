import { Context, Next } from 'hono';
import type { APIError } from '../types';

export async function errorMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);

    const error = err as Error;
    const status = (err as { status?: number }).status || 500;

    const response: APIError = {
      error: status >= 500 ? 'internal_error' : 'request_error',
      message: error.message || 'An unexpected error occurred',
    };

    return c.json(response, status);
  }
}
