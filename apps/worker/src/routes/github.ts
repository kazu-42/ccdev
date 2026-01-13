// GitHub OAuth and API Routes for ccdev
import { Hono } from 'hono';
import { generateId } from '../db/queries';
import type { User } from '../db/types';
import { authMiddleware } from '../middleware/auth';
import { decrypt, encrypt } from '../services/encryption';
import type { Env, GitHubRepo } from '../types';

const github = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes EXCEPT the callback
// The callback is authenticated via state cookies set during /auth
github.use('*', async (c, next) => {
  // Skip auth for callback - it uses state cookies for authentication
  if (c.req.path.endsWith('/auth/callback')) {
    return next();
  }
  return authMiddleware(c, next);
});

// GitHub OAuth scopes
const GITHUB_SCOPES = 'repo user:email';

// Start GitHub OAuth flow
github.get('/auth', async (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.GITHUB_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json({ error: 'GitHub OAuth not configured' }, 500);
  }

  const state = crypto.randomUUID();
  const user = c.get('user') as User;

  // Store state in KV or cookie for CSRF protection
  // Using cookie since KV might not be available
  c.header(
    'Set-Cookie',
    `github_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  c.header(
    'Set-Cookie',
    `github_oauth_user=${user.id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    { append: true },
  );

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', GITHUB_SCOPES);
  authUrl.searchParams.set('state', state);

  return c.redirect(authUrl.toString());
});

// GitHub OAuth callback
github.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.redirect(`/?github=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect('/?github=error&reason=invalid_callback');
  }

  // Verify state
  const cookie = c.req.header('Cookie');
  const stateMatch = cookie?.match(/github_oauth_state=([^;]+)/);
  const userMatch = cookie?.match(/github_oauth_user=([^;]+)/);

  if (!stateMatch || stateMatch[1] !== state) {
    return c.redirect('/?github=error&reason=invalid_state');
  }

  const userId = userMatch?.[1];
  if (!userId) {
    return c.redirect('/?github=error&reason=no_user');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: c.env.GITHUB_CLIENT_ID,
          client_secret: c.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error(
        'GitHub token exchange failed:',
        await tokenResponse.text(),
      );
      return c.redirect('/?github=error&reason=token_exchange_failed');
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      scope: string;
      token_type: string;
      error?: string;
    };

    if (tokenData.error) {
      return c.redirect(
        `/?github=error&reason=${encodeURIComponent(tokenData.error)}`,
      );
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'ccdev',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      return c.redirect('/?github=error&reason=user_fetch_failed');
    }

    const githubUser = (await userResponse.json()) as {
      id: number;
      login: string;
    };

    // Encrypt the access token
    const encryptionKey = c.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return c.redirect('/?github=error&reason=encryption_not_configured');
    }

    const { encrypted, iv } = await encrypt(
      tokenData.access_token,
      encryptionKey,
    );

    // Save or update GitHub connection
    const connectionId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO github_connections (id, user_id, github_user_id, github_username, access_token_encrypted, token_iv, scopes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        github_user_id = excluded.github_user_id,
        github_username = excluded.github_username,
        access_token_encrypted = excluded.access_token_encrypted,
        token_iv = excluded.token_iv,
        scopes = excluded.scopes,
        updated_at = datetime('now')
    `)
      .bind(
        connectionId,
        userId,
        String(githubUser.id),
        githubUser.login,
        encrypted,
        iv,
        tokenData.scope,
      )
      .run();

    // Clear state cookies
    c.header(
      'Set-Cookie',
      'github_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    );
    c.header(
      'Set-Cookie',
      'github_oauth_user=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      { append: true },
    );

    return c.redirect('/?github=connected');
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    return c.redirect('/?github=error&reason=callback_failed');
  }
});

// Get GitHub connection status
github.get('/status', async (c) => {
  const user = c.get('user') as User;

  const result = await c.env.DB.prepare(`
    SELECT id, github_username, scopes, created_at, updated_at
    FROM github_connections
    WHERE user_id = ?
  `)
    .bind(user.id)
    .first<{
      id: string;
      github_username: string;
      scopes: string;
      created_at: string;
      updated_at: string;
    }>();

  if (!result) {
    return c.json({ connected: false });
  }

  return c.json({
    connected: true,
    username: result.github_username,
    scopes: result.scopes.split(','),
    connectedAt: result.created_at,
  });
});

// Disconnect GitHub
github.delete('/disconnect', async (c) => {
  const user = c.get('user') as User;

  // First, delete any project repositories that use this connection
  const connection = await c.env.DB.prepare(`
    SELECT id FROM github_connections WHERE user_id = ?
  `)
    .bind(user.id)
    .first<{ id: string }>();

  if (connection) {
    await c.env.DB.prepare(`
      DELETE FROM project_repositories WHERE github_connection_id = ?
    `)
      .bind(connection.id)
      .run();
  }

  // Then delete the connection
  await c.env.DB.prepare(`
    DELETE FROM github_connections WHERE user_id = ?
  `)
    .bind(user.id)
    .run();

  return c.json({ success: true });
});

// List user's GitHub repositories
github.get('/repos', async (c) => {
  const user = c.get('user') as User;
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = parseInt(c.req.query('per_page') || '30', 10);

  // Get the user's GitHub connection
  const connection = await c.env.DB.prepare(`
    SELECT access_token_encrypted, token_iv
    FROM github_connections
    WHERE user_id = ?
  `)
    .bind(user.id)
    .first<{
      access_token_encrypted: string;
      token_iv: string;
    }>();

  if (!connection) {
    return c.json({ error: 'GitHub not connected' }, 400);
  }

  // Decrypt the access token
  const encryptionKey = c.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return c.json({ error: 'Encryption not configured' }, 500);
  }

  const accessToken = await decrypt(
    connection.access_token_encrypted,
    connection.token_iv,
    encryptionKey,
  );

  // Fetch repositories from GitHub
  const response = await fetch(
    `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'ccdev',
        Accept: 'application/vnd.github.v3+json',
      },
    },
  );

  if (!response.ok) {
    console.error('GitHub repos fetch failed:', await response.text());
    return c.json({ error: 'Failed to fetch repositories' }, 500);
  }

  const repos = (await response.json()) as GitHubRepo[];

  // Get pagination info from headers
  const linkHeader = response.headers.get('Link');
  let hasMore = false;
  if (linkHeader) {
    hasMore = linkHeader.includes('rel="next"');
  }

  return c.json({
    repos: repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      private: repo.private,
      description: repo.description,
    })),
    page,
    perPage,
    hasMore,
  });
});

// Helper function to get decrypted access token for a user
export async function getGitHubAccessToken(
  db: D1Database,
  userId: string,
  encryptionKey: string,
): Promise<string | null> {
  const connection = await db
    .prepare(`
    SELECT access_token_encrypted, token_iv
    FROM github_connections
    WHERE user_id = ?
  `)
    .bind(userId)
    .first<{
      access_token_encrypted: string;
      token_iv: string;
    }>();

  if (!connection) {
    return null;
  }

  return decrypt(
    connection.access_token_encrypted,
    connection.token_iv,
    encryptionKey,
  );
}

export default github;
