// Authentication Routes for ccdev
import { Hono } from 'hono';
import type { Env } from '../types';
import { userQueries, generateId } from '../db/queries';
import { signJWT, setAuthCookie, clearAuthCookie, authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

// Google OAuth configuration
// These should be set as environment secrets
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = 'https://ccdev.ghive.jp/api/auth/callback';

// Start OAuth flow
auth.get('/login', (c) => {
  const state = crypto.randomUUID();
  const scope = 'openid email profile';

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // Set state cookie for CSRF protection
  c.header('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  return c.redirect(authUrl.toString());
});

// OAuth callback
auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.redirect('/?error=oauth_denied');
  }

  if (!code || !state) {
    return c.redirect('/?error=invalid_callback');
  }

  // Verify state (CSRF protection)
  const cookie = c.req.header('Cookie');
  const stateMatch = cookie?.match(/oauth_state=([^;]+)/);
  if (!stateMatch || stateMatch[1] !== state) {
    return c.redirect('/?error=invalid_state');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return c.redirect('/?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json() as { access_token: string; id_token: string };

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return c.redirect('/?error=userinfo_failed');
    }

    const googleUser = await userInfoResponse.json() as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Find or create user
    let user = await userQueries.findByEmail(c.env.DB, googleUser.email);

    if (!user) {
      // Create new user
      user = await userQueries.create(c.env.DB, {
        id: generateId(),
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture,
        role: 'user', // Default role
      });
    } else {
      // Update user info
      await userQueries.update(c.env.DB, user.id, {
        name: googleUser.name,
        avatar_url: googleUser.picture,
      });
    }

    // Generate JWT
    const token = await signJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Set auth cookie and redirect
    setAuthCookie(c, token);

    // Clear state cookie
    c.header('Set-Cookie', 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0', { append: true });

    return c.redirect('/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return c.redirect('/?error=oauth_failed');
  }
});

// Logout
auth.post('/logout', (c) => {
  clearAuthCookie(c);
  return c.json({ success: true });
});

// Get current user
auth.get('/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
  });
});

// Development-only: Mock login (for testing without Google OAuth)
auth.post('/dev-login', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not available in production' }, 403);
  }

  const body = await c.req.json<{ email: string; name?: string }>();
  const { email, name = 'Dev User' } = body;

  if (!email) {
    return c.json({ error: 'Email required' }, 400);
  }

  // Find or create user
  let user = await userQueries.findByEmail(c.env.DB, email);

  if (!user) {
    user = await userQueries.create(c.env.DB, {
      id: generateId(),
      email,
      name,
      avatar_url: null,
      role: email.includes('admin') ? 'admin' : 'user',
    });
  }

  // Generate JWT
  const token = await signJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  setAuthCookie(c, token);

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

export default auth;
