import { create } from 'zustand';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

interface TerminalState {
  sessionId: string | null;
  connectionStatus: ConnectionStatus;
  error: string | null;

  // Actions
  setSessionId: (id: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const generateSessionId = () => Math.random().toString(36).substring(2, 15);

export const useTerminalStore = create<TerminalState>((set) => ({
  sessionId: null,
  connectionStatus: 'disconnected',
  error: null,

  setSessionId: (id) => set({ sessionId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setError: (error) =>
    set({ error, connectionStatus: error ? 'error' : 'disconnected' }),

  reset: () =>
    set({
      sessionId: generateSessionId(),
      connectionStatus: 'disconnected',
      error: null,
    }),
}));
