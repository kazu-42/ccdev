import { create } from 'zustand';
import { api, type User, type Project, type Permission } from '@/lib/api';

interface AdminStats {
  total_users: number;
  total_projects: number;
  total_sessions: number;
  admin_users: number;
}

interface AdminState {
  // Stats
  stats: AdminStats | null;
  recentProjects: Project[];
  recentUsers: User[];

  // Users
  users: User[];
  usersLoading: boolean;

  // Projects
  projects: Project[];
  projectsLoading: boolean;

  // Permissions
  permissions: Permission[];
  permissionsLoading: boolean;

  // General
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchUsers: (limit?: number, offset?: number) => Promise<void>;
  fetchProjects: (limit?: number, offset?: number) => Promise<void>;
  fetchPermissions: (limit?: number, offset?: number) => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createPermission: (data: {
    user_id: string;
    resource_type: Permission['resource_type'];
    resource_id?: string;
    action: Permission['action'];
  }) => Promise<void>;
  deletePermission: (permissionId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  recentProjects: [],
  recentUsers: [],
  users: [],
  usersLoading: false,
  projects: [],
  projectsLoading: false,
  permissions: [],
  permissionsLoading: false,
  error: null,

  fetchStats: async () => {
    try {
      const data = await api.getAdminStats();
      set({
        stats: data.stats,
        recentProjects: data.recent.projects,
        recentUsers: data.recent.users,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch stats' });
    }
  },

  fetchUsers: async (limit = 100, offset = 0) => {
    set({ usersLoading: true, error: null });
    try {
      const data = await api.getAdminUsers(limit, offset);
      set({ users: data.users, usersLoading: false });
    } catch (error) {
      set({
        usersLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      });
    }
  },

  fetchProjects: async (limit = 100, offset = 0) => {
    set({ projectsLoading: true, error: null });
    try {
      const data = await api.getAdminProjects(limit, offset);
      set({ projects: data.projects, projectsLoading: false });
    } catch (error) {
      set({
        projectsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
      });
    }
  },

  fetchPermissions: async (limit = 100, offset = 0) => {
    set({ permissionsLoading: true, error: null });
    try {
      const data = await api.getAdminPermissions(limit, offset);
      set({ permissions: data.permissions, permissionsLoading: false });
    } catch (error) {
      set({
        permissionsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch permissions',
      });
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      await api.updateAdminUser(userId, { role });
      // Refresh users list
      get().fetchUsers();
      get().fetchStats();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update user' });
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      await api.deleteAdminUser(userId);
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
      }));
      get().fetchStats();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete user' });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    try {
      await api.deleteAdminProject(projectId);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
      }));
      get().fetchStats();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete project' });
      throw error;
    }
  },

  createPermission: async (data) => {
    try {
      await api.createAdminPermission(data);
      get().fetchPermissions();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create permission' });
      throw error;
    }
  },

  deletePermission: async (permissionId) => {
    try {
      await api.deleteAdminPermission(permissionId);
      set((state) => ({
        permissions: state.permissions.filter((p) => p.id !== permissionId),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete permission' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
