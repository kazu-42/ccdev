import { create } from 'zustand';
import {
  api,
  type GitHubStatus,
  type GitHubRepo,
  type ProjectRepository,
  type GitStatus,
  type GitCommit,
} from '@/lib/api';

interface GitState {
  // GitHub connection state
  githubStatus: GitHubStatus | null;
  isCheckingConnection: boolean;

  // Repository state for current project
  repository: ProjectRepository | null;
  gitStatus: GitStatus | null;
  branches: string[];
  currentBranch: string | null;
  commits: GitCommit[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // GitHub repos list (for clone modal)
  githubRepos: GitHubRepo[];
  reposPage: number;
  hasMoreRepos: boolean;
  isLoadingRepos: boolean;

  // Actions - GitHub connection
  checkGitHubConnection: () => Promise<void>;
  disconnectGitHub: () => Promise<void>;
  fetchGitHubRepos: (page?: number) => Promise<void>;

  // Actions - Repository management
  fetchRepository: (projectId: string) => Promise<void>;
  cloneRepository: (
    projectId: string,
    repo: GitHubRepo
  ) => Promise<void>;
  disconnectRepository: (projectId: string) => Promise<void>;

  // Actions - Git operations
  refreshStatus: (projectId: string) => Promise<void>;
  pull: (projectId: string) => Promise<{ success: boolean; message: string }>;
  push: (projectId: string) => Promise<{ success: boolean; message: string }>;
  commit: (
    projectId: string,
    message: string,
    files?: string[]
  ) => Promise<{ success: boolean; message: string }>;
  fetchBranches: (projectId: string) => Promise<void>;
  checkout: (
    projectId: string,
    branch: string,
    create?: boolean
  ) => Promise<{ success: boolean; message: string }>;
  fetchLog: (projectId: string, limit?: number) => Promise<void>;

  // Actions - Utility
  clearError: () => void;
  reset: () => void;
}

export const useGitStore = create<GitState>((set, get) => ({
  // Initial state
  githubStatus: null,
  isCheckingConnection: false,
  repository: null,
  gitStatus: null,
  branches: [],
  currentBranch: null,
  commits: [],
  isLoading: false,
  error: null,
  githubRepos: [],
  reposPage: 1,
  hasMoreRepos: false,
  isLoadingRepos: false,

  // GitHub connection
  checkGitHubConnection: async () => {
    set({ isCheckingConnection: true });
    try {
      const status = await api.getGitHubStatus();
      set({ githubStatus: status, isCheckingConnection: false });
    } catch (error) {
      set({
        githubStatus: { connected: false },
        isCheckingConnection: false,
        error: error instanceof Error ? error.message : 'Failed to check GitHub connection',
      });
    }
  },

  disconnectGitHub: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.disconnectGitHub();
      set({
        githubStatus: { connected: false },
        repository: null,
        gitStatus: null,
        branches: [],
        currentBranch: null,
        commits: [],
        githubRepos: [],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect GitHub',
      });
    }
  },

  fetchGitHubRepos: async (page = 1) => {
    set({ isLoadingRepos: true, error: null });
    try {
      const result = await api.getGitHubRepos(page, 30);
      set({
        githubRepos: page === 1 ? result.repos : [...get().githubRepos, ...result.repos],
        reposPage: page,
        hasMoreRepos: result.hasMore,
        isLoadingRepos: false,
      });
    } catch (error) {
      set({
        isLoadingRepos: false,
        error: error instanceof Error ? error.message : 'Failed to fetch repositories',
      });
    }
  },

  // Repository management
  fetchRepository: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const { repository } = await api.getProjectRepository(projectId);
      set({
        repository,
        isLoading: false,
        gitStatus: null,
        branches: [],
        currentBranch: null,
        commits: [],
      });

      // If we have a repository, fetch status
      if (repository) {
        get().refreshStatus(projectId);
      }
    } catch (error) {
      set({
        repository: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch repository',
      });
    }
  },

  cloneRepository: async (projectId, repo) => {
    set({ isLoading: true, error: null });
    try {
      const { repository } = await api.cloneRepository(projectId, {
        repoFullName: repo.fullName,
        repoUrl: repo.cloneUrl,
        defaultBranch: repo.defaultBranch,
      });
      set({ repository, isLoading: false });

      // Fetch status after cloning
      get().refreshStatus(projectId);
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to clone repository',
      });
      throw error;
    }
  },

  disconnectRepository: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      await api.disconnectRepository(projectId);
      set({
        repository: null,
        gitStatus: null,
        branches: [],
        currentBranch: null,
        commits: [],
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect repository',
      });
    }
  },

  // Git operations
  refreshStatus: async (projectId) => {
    try {
      const { status } = await api.getGitStatus(projectId);
      set({ gitStatus: status, currentBranch: status.branch });
    } catch (error) {
      // Status might fail if not a git repo
      set({ gitStatus: null });
    }
  },

  pull: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.gitPull(projectId);
      set({ isLoading: false });

      if (result.success) {
        // Refresh status after pull
        get().refreshStatus(projectId);
      }

      return {
        success: result.success,
        message: result.success ? 'Pull successful' : result.stderr,
      };
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Pull failed',
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Pull failed',
      };
    }
  },

  push: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.gitPush(projectId);
      set({ isLoading: false });

      if (result.success) {
        get().refreshStatus(projectId);
      }

      return {
        success: result.success,
        message: result.success ? 'Push successful' : result.stderr,
      };
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Push failed',
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Push failed',
      };
    }
  },

  commit: async (projectId, message, files) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.gitCommit(projectId, message, files);
      set({ isLoading: false });

      if (result.success) {
        get().refreshStatus(projectId);
        get().fetchLog(projectId);
      }

      return {
        success: result.success,
        message: result.success ? 'Commit successful' : result.stderr,
      };
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Commit failed',
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Commit failed',
      };
    }
  },

  fetchBranches: async (projectId) => {
    try {
      const { branches, current } = await api.getGitBranches(projectId, true);
      set({ branches, currentBranch: current });
    } catch (error) {
      set({ branches: [], currentBranch: null });
    }
  },

  checkout: async (projectId, branch, create = false) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.gitCheckout(projectId, branch, create);
      set({ isLoading: false });

      if (result.success) {
        set({ currentBranch: branch });
        get().refreshStatus(projectId);
        get().fetchBranches(projectId);
      }

      return {
        success: result.success,
        message: result.success ? `Switched to ${branch}` : result.stderr,
      };
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Checkout failed',
      };
    }
  },

  fetchLog: async (projectId, limit = 20) => {
    try {
      const { commits } = await api.getGitLog(projectId, limit);
      set({ commits });
    } catch (error) {
      set({ commits: [] });
    }
  },

  // Utility
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      githubStatus: null,
      isCheckingConnection: false,
      repository: null,
      gitStatus: null,
      branches: [],
      currentBranch: null,
      commits: [],
      isLoading: false,
      error: null,
      githubRepos: [],
      reposPage: 1,
      hasMoreRepos: false,
      isLoadingRepos: false,
    }),
}));
