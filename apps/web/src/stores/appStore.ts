import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'chat' | 'terminal' | 'editor';
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
    }),
    {
      name: 'ccdev-app-storage',
      version: 2, // Increment to clear old auth state from localStorage
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        activeActivity: state.activeActivity,
      }),
    }
  )
);
