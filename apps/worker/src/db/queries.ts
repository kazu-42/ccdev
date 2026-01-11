// Type-safe D1 Query Helpers for ccdev
import type { User, Project, Session, Permission, CreateUser, CreateProject, CreateSession, CreatePermission, UpdateUser, UpdateProject } from './types';

// Helper to generate UUIDs
export function generateId(): string {
  return crypto.randomUUID();
}

// User Queries
export const userQueries = {
  async findById(db: D1Database, id: string): Promise<User | null> {
    const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
    return result;
  },

  async findByEmail(db: D1Database, email: string): Promise<User | null> {
    const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
    return result;
  },

  async create(db: D1Database, user: CreateUser): Promise<User> {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO users (id, email, name, avatar_url, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(user.id, user.email, user.name, user.avatar_url, user.role, now, now).run();
    return { ...user, created_at: now, updated_at: now };
  },

  async update(db: D1Database, id: string, data: UpdateUser): Promise<void> {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  },

  async list(db: D1Database, limit = 100, offset = 0): Promise<User[]> {
    const result = await db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all<User>();
    return result.results;
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  },
};

// Project Queries
export const projectQueries = {
  async findById(db: D1Database, id: string): Promise<Project | null> {
    const result = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Project>();
    return result;
  },

  async findByUserId(db: D1Database, userId: string): Promise<Project[]> {
    const result = await db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY last_accessed_at DESC NULLS LAST, created_at DESC')
      .bind(userId).all<Project>();
    return result.results;
  },

  async create(db: D1Database, project: CreateProject): Promise<Project> {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO projects (id, user_id, name, description, sandbox_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(project.id, project.user_id, project.name, project.description, project.sandbox_id, now, now).run();
    return { ...project, created_at: now, updated_at: now, last_accessed_at: null };
  },

  async update(db: D1Database, id: string, data: UpdateProject): Promise<void> {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.sandbox_id !== undefined) { fields.push('sandbox_id = ?'); values.push(data.sandbox_id); }
    if (data.last_accessed_at !== undefined) { fields.push('last_accessed_at = ?'); values.push(data.last_accessed_at); }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  },

  async updateLastAccessed(db: D1Database, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare('UPDATE projects SET last_accessed_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, id).run();
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  },

  async listAll(db: D1Database, limit = 100, offset = 0): Promise<Project[]> {
    const result = await db.prepare('SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all<Project>();
    return result.results;
  },
};

// Session Queries
export const sessionQueries = {
  async findById(db: D1Database, id: string): Promise<Session | null> {
    const result = await db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first<Session>();
    return result;
  },

  async findByProjectId(db: D1Database, projectId: string): Promise<Session[]> {
    const result = await db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC')
      .bind(projectId).all<Session>();
    return result.results;
  },

  async findLatestByProjectId(db: D1Database, projectId: string): Promise<Session | null> {
    const result = await db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(projectId).first<Session>();
    return result;
  },

  async create(db: D1Database, session: CreateSession): Promise<Session> {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO sessions (id, project_id, terminal_session_id, chat_history, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.id, session.project_id, session.terminal_session_id, session.chat_history, now).run();
    return { ...session, created_at: now, ended_at: null };
  },

  async updateChatHistory(db: D1Database, id: string, chatHistory: string): Promise<void> {
    await db.prepare('UPDATE sessions SET chat_history = ? WHERE id = ?').bind(chatHistory, id).run();
  },

  async end(db: D1Database, id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?').bind(now, id).run();
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
  },
};

// Permission Queries
export const permissionQueries = {
  async findByUserId(db: D1Database, userId: string): Promise<Permission[]> {
    const result = await db.prepare('SELECT * FROM permissions WHERE user_id = ?')
      .bind(userId).all<Permission>();
    return result.results;
  },

  async hasPermission(
    db: D1Database,
    userId: string,
    resourceType: Permission['resource_type'],
    action: Permission['action'],
    resourceId?: string
  ): Promise<boolean> {
    let query = 'SELECT 1 FROM permissions WHERE user_id = ? AND resource_type = ? AND action = ?';
    const params: (string | null)[] = [userId, resourceType, action];

    if (resourceId) {
      query += ' AND (resource_id = ? OR resource_id IS NULL)';
      params.push(resourceId);
    }

    const result = await db.prepare(query).bind(...params).first();
    return result !== null;
  },

  async create(db: D1Database, permission: CreatePermission): Promise<Permission> {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT INTO permissions (id, user_id, resource_type, resource_id, action, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(permission.id, permission.user_id, permission.resource_type, permission.resource_id, permission.action, now).run();
    return { ...permission, created_at: now };
  },

  async delete(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM permissions WHERE id = ?').bind(id).run();
  },

  async deleteByUserId(db: D1Database, userId: string): Promise<void> {
    await db.prepare('DELETE FROM permissions WHERE user_id = ?').bind(userId).run();
  },

  async list(db: D1Database, limit = 100, offset = 0): Promise<Permission[]> {
    const result = await db.prepare('SELECT * FROM permissions ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset).all<Permission>();
    return result.results;
  },
};
