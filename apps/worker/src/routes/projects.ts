// Project Management Routes for ccdev
import { Hono } from 'hono';
import type { Env, ProjectRepository } from '../types';
import { projectQueries, sessionQueries, generateId } from '../db/queries';
import { authMiddleware } from '../middleware/auth';
import { projectOwnerOnly, getCurrentUser } from '../middleware/authorize';
import { GitService } from '../services/git';
import { decrypt } from '../services/encryption';

const projects = new Hono<{ Bindings: Env }>();

// All project routes require authentication
projects.use('*', authMiddleware);

// List user's projects
projects.get('/', async (c) => {
  const user = getCurrentUser(c);
  const userProjects = await projectQueries.findByUserId(c.env.DB, user.id);
  return c.json({ projects: userProjects });
});

// Create new project
projects.post('/', async (c) => {
  const user = getCurrentUser(c);
  const body = await c.req.json<{ name: string; description?: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: 'Bad Request', message: 'Project name required' }, 400);
  }

  const projectId = generateId();
  const sandboxId = `${user.id.slice(0, 8)}-${projectId.slice(0, 8)}`;

  const project = await projectQueries.create(c.env.DB, {
    id: projectId,
    user_id: user.id,
    name: body.name.trim(),
    description: body.description || null,
    sandbox_id: sandboxId,
  });

  return c.json({ project }, 201);
});

// Get single project
projects.get('/:id', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const project = await projectQueries.findById(c.env.DB, projectId);

  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  // Update last accessed
  await projectQueries.updateLastAccessed(c.env.DB, projectId);

  return c.json({ project });
});

// Update project
projects.patch('/:id', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ name?: string; description?: string }>();

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const updates: { name?: string; description?: string } = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description;

  if (Object.keys(updates).length > 0) {
    await projectQueries.update(c.env.DB, projectId, updates);
  }

  const updated = await projectQueries.findById(c.env.DB, projectId);
  return c.json({ project: updated });
});

// Delete project
projects.delete('/:id', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  await projectQueries.delete(c.env.DB, projectId);
  return c.json({ success: true });
});

// Get project sessions (history)
projects.get('/:id/sessions', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const sessions = await sessionQueries.findByProjectId(c.env.DB, projectId);
  return c.json({ sessions });
});

// Create new session for project
projects.post('/:id/sessions', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const sessionId = generateId();
  const terminalSessionId = crypto.randomUUID().slice(0, 11).replace(/-/g, '');

  const session = await sessionQueries.create(c.env.DB, {
    id: sessionId,
    project_id: projectId,
    terminal_session_id: terminalSessionId,
    chat_history: null,
  });

  // Update project last accessed
  await projectQueries.updateLastAccessed(c.env.DB, projectId);

  return c.json({ session }, 201);
});

// Get latest session for resume
projects.get('/:id/sessions/latest', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const session = await sessionQueries.findLatestByProjectId(c.env.DB, projectId);

  if (!session) {
    return c.json({ session: null });
  }

  return c.json({ session });
});

// ============================================
// Repository Management Endpoints
// ============================================

// Helper to get GitService for a project
async function getGitService(
  c: { env: Env; req: { param: (key: string) => string } },
  project: { sandbox_id: string | null; user_id: string }
): Promise<GitService | null> {
  const encryptionKey = c.env.TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return null;
  }

  // Get GitHub connection for the user
  const connection = await c.env.DB.prepare(`
    SELECT access_token_encrypted, token_iv
    FROM github_connections
    WHERE user_id = ?
  `).bind(project.user_id).first<{
    access_token_encrypted: string;
    token_iv: string;
  }>();

  if (!connection) {
    return null;
  }

  const accessToken = await decrypt(
    connection.access_token_encrypted,
    connection.token_iv,
    encryptionKey
  );

  return new GitService(c.env, project.sandbox_id || 'default', accessToken);
}

// Get project repository info
projects.get('/:id/repository', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  const repo = await c.env.DB.prepare(`
    SELECT pr.*, gc.github_username
    FROM project_repositories pr
    JOIN github_connections gc ON pr.github_connection_id = gc.id
    WHERE pr.project_id = ?
  `).bind(projectId).first<ProjectRepository & { github_username: string }>();

  if (!repo) {
    return c.json({ repository: null });
  }

  return c.json({
    repository: {
      id: repo.id,
      repoFullName: repo.repoFullName,
      repoUrl: repo.repoUrl,
      defaultBranch: repo.defaultBranch,
      clonePath: repo.clonePath,
      lastSyncedAt: repo.lastSyncedAt,
      githubUsername: repo.github_username,
    },
  });
});

// Clone a repository to project
projects.post('/:id/repository', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const user = getCurrentUser(c);

  const body = await c.req.json<{
    repoFullName: string;
    repoUrl: string;
    defaultBranch?: string;
    clonePath?: string;
  }>();

  if (!body.repoFullName || !body.repoUrl) {
    return c.json({ error: 'Bad Request', message: 'repoFullName and repoUrl are required' }, 400);
  }

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  // Check if project already has a repository
  const existing = await c.env.DB.prepare(`
    SELECT id FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first();

  if (existing) {
    return c.json({ error: 'Conflict', message: 'Project already has a repository' }, 409);
  }

  // Get GitHub connection
  const connection = await c.env.DB.prepare(`
    SELECT id FROM github_connections WHERE user_id = ?
  `).bind(user.id).first<{ id: string }>();

  if (!connection) {
    return c.json({ error: 'Bad Request', message: 'GitHub not connected' }, 400);
  }

  // Get GitService and clone
  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  const clonePath = body.clonePath || '/workspace';

  try {
    const result = await gitService.clone(body.repoUrl, {
      path: clonePath,
      branch: body.defaultBranch,
    });

    if (result.exitCode !== 0) {
      return c.json({
        error: 'Clone Failed',
        message: result.stderr || 'Failed to clone repository',
      }, 500);
    }

    // Save repository info
    const repoId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO project_repositories (id, project_id, github_connection_id, repo_full_name, repo_url, default_branch, clone_path, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      repoId,
      projectId,
      connection.id,
      body.repoFullName,
      body.repoUrl,
      body.defaultBranch || 'main',
      clonePath
    ).run();

    return c.json({
      success: true,
      repository: {
        id: repoId,
        repoFullName: body.repoFullName,
        repoUrl: body.repoUrl,
        defaultBranch: body.defaultBranch || 'main',
        clonePath,
      },
    }, 201);
  } catch (error) {
    return c.json({
      error: 'Clone Failed',
      message: (error as Error).message,
    }, 500);
  }
});

// Disconnect repository from project
projects.delete('/:id/repository', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  await c.env.DB.prepare(`
    DELETE FROM project_repositories WHERE project_id = ?
  `).bind(projectId).run();

  return c.json({ success: true });
});

// ============================================
// Git Operations Endpoints
// ============================================

// Get git status
projects.get('/:id/git/status', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked to project' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  try {
    const status = await gitService.status(repo.clone_path);
    return c.json({ status });
  } catch (error) {
    return c.json({ error: 'Git Error', message: (error as Error).message }, 500);
  }
});

// Git pull
projects.post('/:id/git/pull', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  const result = await gitService.pull(repo.clone_path);

  // Update last synced
  if (result.exitCode === 0) {
    await c.env.DB.prepare(`
      UPDATE project_repositories SET last_synced_at = datetime('now') WHERE project_id = ?
    `).bind(projectId).run();
  }

  return c.json({
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  });
});

// Git push
projects.post('/:id/git/push', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ force?: boolean; setUpstream?: string }>().catch(() => ({ force: undefined, setUpstream: undefined }));

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  const result = await gitService.push(repo.clone_path, {
    force: body.force,
    setUpstream: body.setUpstream,
  });

  return c.json({
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  });
});

// Git commit
projects.post('/:id/git/commit', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ message: string; files?: string[] }>();

  if (!body.message) {
    return c.json({ error: 'Bad Request', message: 'Commit message required' }, 400);
  }

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  const result = await gitService.commit(repo.clone_path, body.message, body.files);

  return c.json({
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  });
});

// Get branches
projects.get('/:id/git/branches', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const all = c.req.query('all') === 'true';

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  try {
    const branches = await gitService.branches(repo.clone_path, { all });
    const current = await gitService.currentBranch(repo.clone_path);
    return c.json({ branches, current });
  } catch (error) {
    return c.json({ error: 'Git Error', message: (error as Error).message }, 500);
  }
});

// Checkout branch
projects.post('/:id/git/checkout', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ branch: string; create?: boolean }>();

  if (!body.branch) {
    return c.json({ error: 'Bad Request', message: 'Branch name required' }, 400);
  }

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  const result = await gitService.checkout(repo.clone_path, body.branch, {
    create: body.create,
  });

  return c.json({
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  });
});

// Get commit log
projects.get('/:id/git/log', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '20');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  try {
    const commits = await gitService.log(repo.clone_path, limit);
    return c.json({ commits });
  } catch (error) {
    return c.json({ error: 'Git Error', message: (error as Error).message }, 500);
  }
});

// Get diff
projects.get('/:id/git/diff', projectOwnerOnly, async (c) => {
  const projectId = c.req.param('id');
  const staged = c.req.query('staged') === 'true';
  const file = c.req.query('file');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const repo = await c.env.DB.prepare(`
    SELECT clone_path FROM project_repositories WHERE project_id = ?
  `).bind(projectId).first<{ clone_path: string }>();

  if (!repo) {
    return c.json({ error: 'Not Found', message: 'No repository linked' }, 404);
  }

  const gitService = await getGitService(c, project);
  if (!gitService) {
    return c.json({ error: 'Internal Error', message: 'Git service not available' }, 500);
  }

  try {
    const diff = await gitService.diff(repo.clone_path, { staged, file: file || undefined });
    return c.json({ diff });
  } catch (error) {
    return c.json({ error: 'Git Error', message: (error as Error).message }, 500);
  }
});

export default projects;
