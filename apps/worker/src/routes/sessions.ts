// Session Routes for ccdev
import { Hono } from 'hono';
import type { Env } from '../types';
import { sessionQueries, projectQueries } from '../db/queries';
import { authMiddleware } from '../middleware/auth';
import { getCurrentUser, isAdmin } from '../middleware/authorize';

const sessions = new Hono<{ Bindings: Env }>();

// All session routes require authentication
sessions.use('*', authMiddleware);

// Get session by ID (for resume)
sessions.get('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const user = getCurrentUser(c);

  const session = await sessionQueries.findById(c.env.DB, sessionId);
  if (!session) {
    return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
  }

  // Check ownership through project
  const project = await projectQueries.findById(c.env.DB, session.project_id);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id && !isAdmin(c)) {
    return c.json({ error: 'Forbidden', message: 'Not your session' }, 403);
  }

  return c.json({ session, project });
});

// Update session chat history
sessions.patch('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const user = getCurrentUser(c);

  const session = await sessionQueries.findById(c.env.DB, sessionId);
  if (!session) {
    return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
  }

  // Check ownership
  const project = await projectQueries.findById(c.env.DB, session.project_id);
  if (!project || (project.user_id !== user.id && !isAdmin(c))) {
    return c.json({ error: 'Forbidden', message: 'Not your session' }, 403);
  }

  const body = await c.req.json<{ chat_history?: string }>();

  if (body.chat_history !== undefined) {
    await sessionQueries.updateChatHistory(c.env.DB, sessionId, body.chat_history);
  }

  const updated = await sessionQueries.findById(c.env.DB, sessionId);
  return c.json({ session: updated });
});

// End session
sessions.post('/:id/end', async (c) => {
  const sessionId = c.req.param('id');
  const user = getCurrentUser(c);

  const session = await sessionQueries.findById(c.env.DB, sessionId);
  if (!session) {
    return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
  }

  // Check ownership
  const project = await projectQueries.findById(c.env.DB, session.project_id);
  if (!project || (project.user_id !== user.id && !isAdmin(c))) {
    return c.json({ error: 'Forbidden', message: 'Not your session' }, 403);
  }

  await sessionQueries.end(c.env.DB, sessionId);

  const updated = await sessionQueries.findById(c.env.DB, sessionId);
  return c.json({ session: updated });
});

// Delete session
sessions.delete('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const user = getCurrentUser(c);

  const session = await sessionQueries.findById(c.env.DB, sessionId);
  if (!session) {
    return c.json({ error: 'Not Found', message: 'Session not found' }, 404);
  }

  // Check ownership
  const project = await projectQueries.findById(c.env.DB, session.project_id);
  if (!project || (project.user_id !== user.id && !isAdmin(c))) {
    return c.json({ error: 'Forbidden', message: 'Not your session' }, 403);
  }

  await sessionQueries.delete(c.env.DB, sessionId);
  return c.json({ success: true });
});

export default sessions;
