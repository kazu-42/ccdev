import { create } from 'zustand';
import { api, type User } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  fetchCurrentUser: () => Promise<void>;
  devLogin: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchCurrentUser: async () => {
    // Skip if already loading or initialized
    const state = get();
    if (state.isLoading || state.isInitialized) return;

    set({ isLoading: true, error: null });

    try {
      const { user } = await api.getCurrentUser();
      set({ user, isLoading: false, isInitialized: true });
    } catch {
      // User not authenticated
      set({
        user: null,
        isLoading: false,
        isInitialized: true,
        error: null, // Don't show error for unauthenticated state
      });
    }
  },

  devLogin: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user } = await api.devLogin(email);
      set({ user, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }

    set({ user: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
