// File System Routes for ccdev
import { Hono } from 'hono';
import { projectQueries } from '../db/queries';
import { authMiddleware } from '../middleware/auth';
import { getCurrentUser } from '../middleware/authorize';
import { type FileEntry, SandboxService } from '../services/sandbox';
import type { Env } from '../types';

const files = new Hono<{ Bindings: Env }>();

// All file routes require authentication
files.use('*', authMiddleware);

interface FileEntryWithPath extends FileEntry {
  path: string;
}

// List files in a directory
files.get('/projects/:projectId/list', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path') || '/workspace';
  const user = getCurrentUser(c);

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  const sandboxId = project.sandbox_id || projectId.slice(0, 8);
  const sandbox = new SandboxService(c.env, sandboxId);

  try {
    const entries = await sandbox.listFiles(path);
    const entriesWithPath: FileEntryWithPath[] = entries.map((entry) => ({
      ...entry,
      path: path === '/' ? `/${entry.name}` : `${path}/${entry.name}`,
    }));

    // Sort: directories first, then files
    entriesWithPath.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return c.json({ path, entries: entriesWithPath });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to list files', message: errorMessage },
      500,
    );
  }
});

// Read file content
files.get('/projects/:projectId/read', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path');
  const user = getCurrentUser(c);

  if (!path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  const sandboxId = project.sandbox_id || projectId.slice(0, 8);
  const sandbox = new SandboxService(c.env, sandboxId);

  try {
    const content = await sandbox.readFile(path);
    return c.json({ path, content });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Failed to read file', message: errorMessage }, 404);
  }
});

// Write file content
files.post('/projects/:projectId/write', async (c) => {
  const projectId = c.req.param('projectId');
  const user = getCurrentUser(c);

  const body = await c.req.json<{ path: string; content: string }>();
  if (!body.path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  const sandboxId = project.sandbox_id || projectId.slice(0, 8);
  const sandbox = new SandboxService(c.env, sandboxId);

  try {
    // Ensure parent directory exists
    const dir = body.path.split('/').slice(0, -1).join('/');
    if (dir) {
      await sandbox.mkdir(dir);
    }
    await sandbox.writeFile(body.path, body.content);
    return c.json({ success: true, path: body.path });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to write file', message: errorMessage },
      500,
    );
  }
});

// Create directory
files.post('/projects/:projectId/mkdir', async (c) => {
  const projectId = c.req.param('projectId');
  const user = getCurrentUser(c);

  const body = await c.req.json<{ path: string }>();
  if (!body.path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  const sandboxId = project.sandbox_id || projectId.slice(0, 8);
  const sandbox = new SandboxService(c.env, sandboxId);

  try {
    await sandbox.mkdir(body.path);
    return c.json({ success: true, path: body.path });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json(
      { error: 'Failed to create directory', message: errorMessage },
      500,
    );
  }
});

// Delete file or directory
files.delete('/projects/:projectId/delete', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path');
  const user = getCurrentUser(c);

  if (!path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  // Prevent deleting root directories
  if (path === '/' || path === '/workspace' || path === '/home') {
    return c.json(
      { error: 'Forbidden', message: 'Cannot delete root directories' },
      403,
    );
  }

  const sandboxId = project.sandbox_id || projectId.slice(0, 8);
  const sandbox = new SandboxService(c.env, sandboxId);

  try {
    await sandbox.deleteFile(path);
    return c.json({ success: true, path });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Failed to delete', message: errorMessage }, 500);
  }
});

export default files;
