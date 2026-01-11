// D1 Database Types for ccdev

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sandbox_id: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

export interface Session {
  id: string;
  project_id: string;
  terminal_session_id: string | null;
  chat_history: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface Permission {
  id: string;
  user_id: string;
  resource_type: 'project' | 'admin_panel' | 'user_management';
  resource_id: string | null;
  action: 'read' | 'write' | 'delete' | 'admin';
  created_at: string;
}

// Input types for creating records
export type CreateUser = Omit<User, 'created_at' | 'updated_at'>;
export type CreateProject = Omit<Project, 'created_at' | 'updated_at' | 'last_accessed_at'>;
export type CreateSession = Omit<Session, 'created_at' | 'ended_at'>;
export type CreatePermission = Omit<Permission, 'created_at'>;

// Update types
export type UpdateUser = Partial<Omit<User, 'id' | 'created_at'>>;
export type UpdateProject = Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>;
