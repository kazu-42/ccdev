import type { Context, Next } from 'hono';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://ccdev.pages.dev',
  'https://ccdev.ghive.jp',  // Custom domain (if configured)
];

// Also allow *.ccdev.pages.dev preview deployments
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9]+\.ccdev\.pages\.dev$/,
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('Origin');

  // Allow requests from allowed origins or same-origin
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Skip CORS headers for WebSocket upgrade responses (status 101)
  // WebSocket responses have immutable headers
  if (c.res.status === 101) {
    return;
  }

  // Add CORS headers to response
  c.res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
}
