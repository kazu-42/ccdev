// API client for ccdev backend

// Use Worker URL directly in production, proxy in development
const API_BASE = import.meta.env.PROD
  ? 'https://ccdev-api.ghive42.workers.dev/api'
  : '/api';

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
  sandbox_id: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

export interface Session {
  id: string;
  project_id: string;
  terminal_session_id: string;
  chat_history: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface Permission {
  id: string;
  user_id: string;
  resource_type: 'project' | 'sandbox' | 'admin';
  resource_id: string | null;
  action: 'read' | 'write' | 'delete' | 'admin';
  created_at: string;
}

export interface ApiError {
  error: string;
  message: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Send cookies for JWT auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Error',
        message: response.statusText,
      }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async devLogin(email: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Project endpoints
  async getProjects(): Promise<{ projects: Project[] }> {
    return this.request('/projects');
  }

  async createProject(name: string, description?: string): Promise<{ project: Project }> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getProject(id: string): Promise<{ project: Project }> {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id: string, data: { name?: string; description?: string }): Promise<{ project: Project }> {
    return this.request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Session endpoints
  async getProjectSessions(projectId: string): Promise<{ sessions: Session[] }> {
    return this.request(`/projects/${projectId}/sessions`);
  }

  async createSession(projectId: string): Promise<{ session: Session }> {
    return this.request(`/projects/${projectId}/sessions`, { method: 'POST' });
  }

  async getLatestSession(projectId: string): Promise<{ session: Session | null }> {
    return this.request(`/projects/${projectId}/sessions/latest`);
  }

  // Admin endpoints
  async getAdminStats(): Promise<{
    stats: {
      total_users: number;
      total_projects: number;
      total_sessions: number;
      admin_users: number;
    };
    recent: {
      projects: Project[];
      users: User[];
    };
  }> {
    return this.request('/admin/stats');
  }

  async getAdminUsers(limit = 100, offset = 0): Promise<{ users: User[]; limit: number; offset: number }> {
    return this.request(`/admin/users?limit=${limit}&offset=${offset}`);
  }

  async getAdminUser(id: string): Promise<{ user: User; projects: Project[]; permissions: Permission[] }> {
    return this.request(`/admin/users/${id}`);
  }

  async updateAdminUser(id: string, data: { role?: 'admin' | 'user'; name?: string }): Promise<{ user: User }> {
    return this.request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async getAdminProjects(limit = 100, offset = 0): Promise<{ projects: Project[]; limit: number; offset: number }> {
    return this.request(`/admin/projects?limit=${limit}&offset=${offset}`);
  }

  async deleteAdminProject(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/projects/${id}`, { method: 'DELETE' });
  }

  async getAdminPermissions(limit = 100, offset = 0): Promise<{ permissions: Permission[]; limit: number; offset: number }> {
    return this.request(`/admin/permissions?limit=${limit}&offset=${offset}`);
  }

  async createAdminPermission(data: {
    user_id: string;
    resource_type: Permission['resource_type'];
    resource_id?: string;
    action: Permission['action'];
  }): Promise<{ permission: Permission }> {
    return this.request('/admin/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminPermission(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/permissions/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
