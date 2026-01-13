import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClaudeState {
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // API configuration
  apiKey: string;
  model: string;

  // Actions
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  testConnection: () => Promise<boolean>;
  disconnect: () => void;
  clearError: () => void;
}

// Available Claude models
export const CLAUDE_MODELS = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    description: 'Best balance of speed and capability',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous generation sonnet',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    description: 'Most capable model',
  },
];

export const useClaudeStore = create<ClaudeState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isLoading: false,
      error: null,
      apiKey: '',
      model: 'claude-sonnet-4-20250514',

      setApiKey: (apiKey) => {
        set({ apiKey, isConnected: false, error: null });
      },

      setModel: (model) => {
        set({ model });
      },

      testConnection: async () => {
        const { apiKey, model } = get();

        if (!apiKey) {
          set({ error: 'API key is required', isConnected: false });
          return false;
        }

        set({ isLoading: true, error: null });

        try {
          // Test the connection with a simple message
          const response = await fetch(
            'https://api.anthropic.com/v1/messages',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
              },
              body: JSON.stringify({
                model,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hi' }],
              }),
            },
          );

          if (response.ok) {
            set({ isConnected: true, isLoading: false, error: null });
            return true;
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
              errorData.error?.message ||
              `Connection failed: ${response.status}`;
            set({ isConnected: false, isLoading: false, error: errorMessage });
            return false;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Connection failed';
          set({ isConnected: false, isLoading: false, error: message });
          return false;
        }
      },

      disconnect: () => {
        set({ isConnected: false, apiKey: '', error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'ccdev-claude-storage',
      version: 1,
      partialize: (state) => ({
        apiKey: state.apiKey,
        model: state.model,
        isConnected: state.isConnected,
      }),
    },
  ),
);
