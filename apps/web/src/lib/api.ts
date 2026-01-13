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

// GitHub types
export interface GitHubStatus {
  connected: boolean;
  username?: string;
  scopes?: string[];
  connectedAt?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  private: boolean;
  description: string | null;
}

export interface ProjectRepository {
  id: string;
  repoFullName: string;
  repoUrl: string;
  defaultBranch: string;
  clonePath: string;
  lastSyncedAt: string | null;
  githubUsername?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  timestamp: number;
  message: string;
}

export interface GitOperationResult {
  success: boolean;
  stdout: string;
  stderr: string;
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

  // GitHub OAuth endpoints
  getGitHubAuthUrl(): string {
    return `${API_BASE}/github/auth`;
  }

  async getGitHubStatus(): Promise<GitHubStatus> {
    return this.request('/github/status');
  }

  async disconnectGitHub(): Promise<{ success: boolean }> {
    return this.request('/github/disconnect', { method: 'DELETE' });
  }

  async getGitHubRepos(page = 1, perPage = 30): Promise<{
    repos: GitHubRepo[];
    page: number;
    perPage: number;
    hasMore: boolean;
  }> {
    return this.request(`/github/repos?page=${page}&per_page=${perPage}`);
  }

  // Project repository endpoints
  async getProjectRepository(projectId: string): Promise<{ repository: ProjectRepository | null }> {
    return this.request(`/projects/${projectId}/repository`);
  }

  async cloneRepository(
    projectId: string,
    data: { repoFullName: string; repoUrl: string; defaultBranch?: string; clonePath?: string }
  ): Promise<{ success: boolean; repository: ProjectRepository }> {
    return this.request(`/projects/${projectId}/repository`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async disconnectRepository(projectId: string): Promise<{ success: boolean }> {
    return this.request(`/projects/${projectId}/repository`, { method: 'DELETE' });
  }

  // Git operation endpoints
  async getGitStatus(projectId: string): Promise<{ status: GitStatus }> {
    return this.request(`/projects/${projectId}/git/status`);
  }

  async gitPull(projectId: string): Promise<GitOperationResult> {
    return this.request(`/projects/${projectId}/git/pull`, { method: 'POST' });
  }

  async gitPush(projectId: string, options?: { force?: boolean; setUpstream?: string }): Promise<GitOperationResult> {
    return this.request(`/projects/${projectId}/git/push`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async gitCommit(projectId: string, message: string, files?: string[]): Promise<GitOperationResult> {
    return this.request(`/projects/${projectId}/git/commit`, {
      method: 'POST',
      body: JSON.stringify({ message, files }),
    });
  }

  async getGitBranches(projectId: string, all = false): Promise<{ branches: string[]; current: string }> {
    return this.request(`/projects/${projectId}/git/branches?all=${all}`);
  }

  async gitCheckout(projectId: string, branch: string, create = false): Promise<GitOperationResult> {
    return this.request(`/projects/${projectId}/git/checkout`, {
      method: 'POST',
      body: JSON.stringify({ branch, create }),
    });
  }

  async getGitLog(projectId: string, limit = 20): Promise<{ commits: GitCommit[] }> {
    return this.request(`/projects/${projectId}/git/log?limit=${limit}`);
  }

  async getGitDiff(projectId: string, options?: { staged?: boolean; file?: string }): Promise<{ diff: string }> {
    const params = new URLSearchParams();
    if (options?.staged) params.set('staged', 'true');
    if (options?.file) params.set('file', options.file);
    return this.request(`/projects/${projectId}/git/diff?${params}`);
  }
}

export const api = new ApiClient();
