// Admin Routes for ccdev
import { Hono } from 'hono';
import {
  generateId,
  permissionQueries,
  projectQueries,
  userQueries,
} from '../db/queries';
import type { Permission } from '../db/types';
import { authMiddleware } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// All admin routes require authentication and admin role
admin.use('*', authMiddleware);
admin.use('*', adminOnly);

// === User Management ===

// List all users
admin.get('/users', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const users = await userQueries.list(c.env.DB, limit, offset);
  return c.json({ users, limit, offset });
});

// Get user by ID
admin.get('/users/:id', async (c) => {
  const userId = c.req.param('id');
  const user = await userQueries.findById(c.env.DB, userId);

  if (!user) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  // Get user's projects and permissions
  const projects = await projectQueries.findByUserId(c.env.DB, userId);
  const permissions = await permissionQueries.findByUserId(c.env.DB, userId);

  return c.json({ user, projects, permissions });
});

// Update user (change role)
admin.patch('/users/:id', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json<{ role?: 'admin' | 'user'; name?: string }>();

  const user = await userQueries.findById(c.env.DB, userId);
  if (!user) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  if (body.role || body.name) {
    await userQueries.update(c.env.DB, userId, {
      role: body.role,
      name: body.name,
    });
  }

  const updated = await userQueries.findById(c.env.DB, userId);
  return c.json({ user: updated });
});

// Delete user
admin.delete('/users/:id', async (c) => {
  const userId = c.req.param('id');

  const user = await userQueries.findById(c.env.DB, userId);
  if (!user) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  // This will cascade delete projects and permissions due to FK constraints
  await userQueries.delete(c.env.DB, userId);
  return c.json({ success: true });
});

// === Project Management ===

// List all projects
admin.get('/projects', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const projects = await projectQueries.listAll(c.env.DB, limit, offset);
  return c.json({ projects, limit, offset });
});

// Get project with owner info
admin.get('/projects/:id', async (c) => {
  const projectId = c.req.param('id');
  const project = await projectQueries.findById(c.env.DB, projectId);

  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  const owner = await userQueries.findById(c.env.DB, project.user_id);
  return c.json({ project, owner });
});

// Delete project (admin override)
admin.delete('/projects/:id', async (c) => {
  const projectId = c.req.param('id');

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  await projectQueries.delete(c.env.DB, projectId);
  return c.json({ success: true });
});

// === Permission Management (CRS) ===

// List all permissions
admin.get('/permissions', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const permissions = await permissionQueries.list(c.env.DB, limit, offset);
  return c.json({ permissions, limit, offset });
});

// Grant permission
admin.post('/permissions', async (c) => {
  const body = await c.req.json<{
    user_id: string;
    resource_type: Permission['resource_type'];
    resource_id?: string;
    action: Permission['action'];
  }>();

  if (!body.user_id || !body.resource_type || !body.action) {
    return c.json(
      { error: 'Bad Request', message: 'Missing required fields' },
      400,
    );
  }

  // Verify user exists
  const user = await userQueries.findById(c.env.DB, body.user_id);
  if (!user) {
    return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  }

  const permission = await permissionQueries.create(c.env.DB, {
    id: generateId(),
    user_id: body.user_id,
    resource_type: body.resource_type,
    resource_id: body.resource_id || null,
    action: body.action,
  });

  return c.json({ permission }, 201);
});

// Revoke permission
admin.delete('/permissions/:id', async (c) => {
  const permissionId = c.req.param('id');
  await permissionQueries.delete(c.env.DB, permissionId);
  return c.json({ success: true });
});

// === System Stats ===

admin.get('/stats', async (c) => {
  // Get counts from each table
  const [usersResult, projectsResult] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{
      count: number;
    }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM projects').first<{
      count: number;
    }>(),
  ]);

  const [sessionsResult, adminCount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM sessions').first<{
      count: number;
    }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
    ).first<{ count: number }>(),
  ]);

  // Get recent activity
  const recentProjects = await c.env.DB.prepare(
    'SELECT * FROM projects ORDER BY last_accessed_at DESC NULLS LAST LIMIT 5',
  ).all();

  const recentUsers = await c.env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT 5',
  ).all();

  return c.json({
    stats: {
      total_users: usersResult?.count || 0,
      total_projects: projectsResult?.count || 0,
      total_sessions: sessionsResult?.count || 0,
      admin_users: adminCount?.count || 0,
    },
    recent: {
      projects: recentProjects.results,
      users: recentUsers.results,
    },
  });
});

export default admin;
