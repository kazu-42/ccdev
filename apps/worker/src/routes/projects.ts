// Project Management Routes for ccdev
import { Hono } from 'hono';
import type { Env } from '../types';
import { projectQueries, sessionQueries, generateId } from '../db/queries';
import { authMiddleware } from '../middleware/auth';
import { projectOwnerOnly, getCurrentUser } from '../middleware/authorize';

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

export default projects;
