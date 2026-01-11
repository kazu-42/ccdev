import { create } from 'zustand';

export type AppMode = 'chat' | 'terminal';

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'terminal',
  setMode: (mode) => set({ mode }),
}));
