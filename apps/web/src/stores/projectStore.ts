import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, type Project, type Session } from '@/lib/api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, data: { name?: string; description?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  createSession: () => Promise<Session | null>;
  clearError: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      currentSession: null,
      isLoading: false,
      error: null,

      fetchProjects: async () => {
        set({ isLoading: true, error: null });

        try {
          const { projects } = await api.getProjects();
          const currentProject = get().currentProject;

          // If we had a current project, try to find it in the new list
          let updatedCurrentProject = currentProject
            ? projects.find((p) => p.id === currentProject.id) || null
            : null;

          // If no current project or it was deleted, select the first project
          if (!updatedCurrentProject && projects.length > 0) {
            updatedCurrentProject = projects[0];
          }

          set({ projects, currentProject: updatedCurrentProject, isLoading: false });

          // If we have a current project, create/get a session
          if (updatedCurrentProject) {
            get().createSession();
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
          });
        }
      },

      setCurrentProject: (project) => {
        set({ currentProject: project, currentSession: null });

        // Create a new session for this project
        if (project) {
          get().createSession();
        }
      },

      createProject: async (name, description) => {
        set({ isLoading: true, error: null });

        try {
          const { project } = await api.createProject(name, description);
          set((state) => ({
            projects: [...state.projects, project],
            currentProject: project,
            isLoading: false,
          }));

          // Create a session for the new project
          get().createSession();

          return project;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to create project',
          });
          throw error;
        }
      },

      updateProject: async (id, data) => {
        set({ isLoading: true, error: null });

        try {
          const { project } = await api.updateProject(id, data);
          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? project : p)),
            currentProject: state.currentProject?.id === id ? project : state.currentProject,
            isLoading: false,
          }));
          return project;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update project',
          });
          throw error;
        }
      },

      deleteProject: async (id) => {
        set({ isLoading: true, error: null });

        try {
          await api.deleteProject(id);
          const projects = get().projects.filter((p) => p.id !== id);
          const currentProject = get().currentProject;

          set({
            projects,
            currentProject: currentProject?.id === id ? (projects[0] || null) : currentProject,
            currentSession: currentProject?.id === id ? null : get().currentSession,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to delete project',
          });
          throw error;
        }
      },

      createSession: async () => {
        const currentProject = get().currentProject;
        if (!currentProject) return null;

        try {
          // First try to get the latest session
          const { session: latestSession } = await api.getLatestSession(currentProject.id);
          if (latestSession && !latestSession.ended_at) {
            set({ currentSession: latestSession });
            return latestSession;
          }

          // Create a new session
          const { session } = await api.createSession(currentProject.id);
          set({ currentSession: session });
          return session;
        } catch {
          // Session creation failed, but we can still continue
          return null;
        }
      },

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          projects: [],
          currentProject: null,
          currentSession: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'ccdev-project-storage',
      partialize: (state) => ({
        currentProject: state.currentProject ? { id: state.currentProject.id } : null,
      }),
    }
  )
);
