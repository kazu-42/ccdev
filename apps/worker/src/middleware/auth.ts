// Authentication Middleware for ccdev
import type { Context, Next } from 'hono';
import { generateId, userQueries } from '../db/queries';
import type { User } from '../db/types';
import type { Env } from '../types';
import { hasAccessHeaders, validateAccessToken } from './cloudflare-access';

// JWT payload structure
export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: 'admin' | 'user';
  exp: number;
  iat: number;
}

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: User;
    jwtPayload: JWTPayload;
  }
}

// Simple JWT implementation using Web Crypto API
const JWT_SECRET_KEY = 'ccdev-jwt-secret-key-change-in-production';
const JWT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET_KEY);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(
    encoder.encode(JSON.stringify(fullPayload)),
  );

  const key = await getKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`),
  );

  return `${headerB64}.${payloadB64}.${base64UrlEncode(signature)}`;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    const key = await getKey();
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(`${headerB64}.${payloadB64}`),
    );

    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    );

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Get token from cookie or Authorization header
function getToken(c: Context): string | null {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookie
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = cookie.match(/ccdev_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Authentication middleware - requires valid JWT or Cloudflare Access
export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
) {
  // 1. First try Cloudflare Access authentication
  if (hasAccessHeaders(c.req.raw)) {
    const accessPayload = await validateAccessToken(c.req.raw, c.env);
    if (accessPayload) {
      // Look up user by email or create new user
      let user = await userQueries.findByEmail(c.env.DB, accessPayload.email);

      if (!user) {
        // Auto-create user on first login via Cloudflare Access
        const userId = generateId();
        user = await userQueries.create(c.env.DB, {
          id: userId,
          email: accessPayload.email,
          name: accessPayload.email.split('@')[0],
          avatar_url: null,
          role: 'user', // Default role, admin can promote later
        });
      }

      // Create JWT payload for compatibility
      const jwtPayload: JWTPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: accessPayload.exp,
      };

      c.set('user', user);
      c.set('jwtPayload', jwtPayload);

      await next();
      return;
    }
  }

  // 2. Fall back to traditional JWT authentication
  const token = getToken(c);

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'No token provided' }, 401);
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return c.json(
      { error: 'Unauthorized', message: 'Invalid or expired token' },
      401,
    );
  }

  // Fetch user from database
  const user = await userQueries.findById(c.env.DB, payload.sub);
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'User not found' }, 401);
  }

  // Set user in context
  c.set('user', user);
  c.set('jwtPayload', payload);

  await next();
}

// Optional auth middleware - sets user if token present, continues otherwise
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
) {
  // 1. Try Cloudflare Access first
  if (hasAccessHeaders(c.req.raw)) {
    const accessPayload = await validateAccessToken(c.req.raw, c.env);
    if (accessPayload) {
      let user = await userQueries.findByEmail(c.env.DB, accessPayload.email);

      if (!user) {
        const userId = generateId();
        user = await userQueries.create(c.env.DB, {
          id: userId,
          email: accessPayload.email,
          name: accessPayload.email.split('@')[0],
          avatar_url: null,
          role: 'user',
        });
      }

      const jwtPayload: JWTPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: accessPayload.exp,
      };

      c.set('user', user);
      c.set('jwtPayload', jwtPayload);

      await next();
      return;
    }
  }

  // 2. Fall back to JWT token
  const token = getToken(c);

  if (token) {
    const payload = await verifyJWT(token);
    if (payload) {
      const user = await userQueries.findById(c.env.DB, payload.sub);
      if (user) {
        c.set('user', user);
        c.set('jwtPayload', payload);
      }
    }
  }

  await next();
}

// Set auth cookie
export function setAuthCookie(c: Context, token: string) {
  const maxAge = JWT_EXPIRY;
  c.header(
    'Set-Cookie',
    `ccdev_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

// Clear auth cookie
export function clearAuthCookie(c: Context) {
  c.header(
    'Set-Cookie',
    'ccdev_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  );
}
