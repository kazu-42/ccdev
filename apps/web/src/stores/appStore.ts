import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'chat' | 'terminal';
export type ActivityType = 'files' | 'chat' | 'terminal' | 'settings' | null;

interface AppState {
  // Main content mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // Activity bar (left sidebar)
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;

  // Sidebar width
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  // Authentication state
  isAuthenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;

  // User info
  user: { email: string; plan: string } | null;
  setUser: (user: { email: string; plan: string } | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Main content mode
      mode: 'terminal',
      setMode: (mode) => set({ mode }),

      // Activity bar - default to files explorer
      activeActivity: 'files',
      setActiveActivity: (activity) => set({ activeActivity: activity }),

      // Sidebar width
      sidebarWidth: 260,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      // Authentication - default to false (require login)
      isAuthenticated: false,
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      // User info
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'ccdev-app-storage',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        activeActivity: state.activeActivity,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
