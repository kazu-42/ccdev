// Authorization Middleware for ccdev
import type { Context, Next } from 'hono';
import { permissionQueries, projectQueries } from '../db/queries';
import type { Permission, User } from '../db/types';
import type { Env } from '../types';

// Admin-only middleware
export async function adminOnly(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as User | undefined;

  if (!user) {
    return c.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      401,
    );
  }

  if (user.role !== 'admin') {
    return c.json(
      { error: 'Forbidden', message: 'Admin access required' },
      403,
    );
  }

  await next();
}

// Check if user has specific permission
export function requirePermission(
  resourceType: Permission['resource_type'],
  action: Permission['action'],
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user') as User | undefined;

    if (!user) {
      return c.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        401,
      );
    }

    // Admins bypass permission checks
    if (user.role === 'admin') {
      await next();
      return;
    }

    const resourceId = c.req.param('id') || c.req.param('projectId');
    const hasPermission = await permissionQueries.hasPermission(
      c.env.DB,
      user.id,
      resourceType,
      action,
      resourceId,
    );

    if (!hasPermission) {
      return c.json({ error: 'Forbidden', message: 'Permission denied' }, 403);
    }

    await next();
  };
}

// Check if user owns the project
export async function projectOwnerOnly(
  c: Context<{ Bindings: Env }>,
  next: Next,
) {
  const user = c.get('user') as User | undefined;

  if (!user) {
    return c.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      401,
    );
  }

  const projectId = c.req.param('id') || c.req.param('projectId');
  if (!projectId) {
    return c.json(
      { error: 'Bad Request', message: 'Project ID required' },
      400,
    );
  }

  // Admins can access all projects
  if (user.role === 'admin') {
    await next();
    return;
  }

  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project) {
    return c.json({ error: 'Not Found', message: 'Project not found' }, 404);
  }

  if (project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  await next();
}

// Helper to get current user (throws if not authenticated)
export function getCurrentUser(c: Context): User {
  const user = c.get('user') as User | undefined;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

// Helper to check if current user is admin
export function isAdmin(c: Context): boolean {
  const user = c.get('user') as User | undefined;
  return user?.role === 'admin';
}
