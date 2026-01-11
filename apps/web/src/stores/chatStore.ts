import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

// API base URL
const API_BASE = import.meta.env.PROD
  ? 'https://ccdev-api.ghive42.workers.dev'
  : '';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  project_id: string;
  project_name?: string;
  terminal_session_id: string | null;
  chat_history: string | null;
  created_at: string;
  ended_at: string | null;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  currentToolCalls: ToolCall[];
  currentToolResults: ToolResult[];

  // Session management
  currentSessionId: string | null;
  currentProjectId: string | null;
  sessions: ChatSession[];
  sessionsLoading: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  appendStreamContent: (content: string) => void;
  addToolCall: (toolCall: ToolCall) => void;
  addToolResult: (result: ToolResult) => void;
  finalizeMessage: () => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;

  // Session actions
  setCurrentSession: (sessionId: string, projectId: string) => void;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  saveSessionHistory: () => Promise<void>;
  createNewSession: (projectId: string) => Promise<ChatSession | null>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  streamingContent: '',
  currentToolCalls: [],
  currentToolResults: [],

  // Session management state
  currentSessionId: null,
  currentProjectId: null,
  sessions: [],
  sessionsLoading: false,

  sendMessage: async (content: string) => {
    const { messages } = get();
    const { yoloMode } = useSettingsStore.getState();

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    set({
      messages: [...messages, userMessage],
      isLoading: true,
      error: null,
      streamingContent: '',
      currentToolCalls: [],
      currentToolResults: [],
    });

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: apiMessages,
          yolo: yoloMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let finalized = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEvent) {
                case 'message':
                  if (data.content) {
                    get().appendStreamContent(data.content);
                  }
                  break;

                case 'tool_use':
                  get().addToolCall({
                    id: data.id,
                    name: data.name,
                    input: data.input,
                  });
                  break;

                case 'tool_result':
                  get().addToolResult({
                    tool_use_id: data.tool_use_id,
                    content: data.content,
                    is_error: data.is_error,
                  });
                  break;

                case 'done':
                  get().finalizeMessage();
                  finalized = true;
                  break;

                case 'error':
                  set({ error: data.message || 'Unknown error', isLoading: false });
                  finalized = true;
                  break;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Ensure message is finalized when stream ends
      if (!finalized) {
        const { streamingContent, currentToolCalls, currentToolResults } = get();
        if (streamingContent || currentToolCalls.length > 0 || currentToolResults.length > 0) {
          get().finalizeMessage();
        }
      }
    } catch (err) {
      const error = err as Error;
      set({ error: error.message, isLoading: false });
    }
  },

  appendStreamContent: (content: string) => {
    set((state) => ({
      streamingContent: state.streamingContent + content,
    }));
  },

  addToolCall: (toolCall: ToolCall) => {
    set((state) => ({
      currentToolCalls: [...state.currentToolCalls, toolCall],
    }));
  },

  addToolResult: (result: ToolResult) => {
    set((state) => ({
      currentToolResults: [...state.currentToolResults, result],
    }));
  },

  finalizeMessage: () => {
    const { messages, streamingContent, currentToolCalls, currentToolResults } = get();

    // Only add a message if there's content or tool activity
    if (streamingContent || currentToolCalls.length > 0) {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: streamingContent,
        toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
        toolResults: currentToolResults.length > 0 ? currentToolResults : undefined,
        createdAt: new Date(),
      };

      set({
        messages: [...messages, assistantMessage],
        streamingContent: '',
        currentToolCalls: [],
        currentToolResults: [],
        isLoading: false,
      });

      // Auto-save to backend after message finalization
      setTimeout(() => {
        get().saveSessionHistory();
      }, 100);
    } else {
      set({
        streamingContent: '',
        currentToolCalls: [],
        currentToolResults: [],
        isLoading: false,
      });
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      error: null,
      streamingContent: '',
      currentToolCalls: [],
      currentToolResults: [],
    });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  // Session management actions
  setCurrentSession: (sessionId: string, projectId: string) => {
    set({
      currentSessionId: sessionId,
      currentProjectId: projectId,
    });
  },

  loadSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const response = await fetch(`${API_BASE}/api/sessions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      set({ sessions: data.sessions, sessionsLoading: false });
    } catch (err) {
      console.error('Failed to load sessions:', err);
      set({ sessionsLoading: false });
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      const session = data.session as ChatSession;

      // Parse chat history
      let messages: Message[] = [];
      if (session.chat_history) {
        try {
          const parsed = JSON.parse(session.chat_history);
          messages = parsed.map((m: {
            id?: string;
            role: 'user' | 'assistant';
            content: string;
            toolCalls?: ToolCall[];
            toolResults?: ToolResult[];
            createdAt?: string;
          }) => ({
            ...m,
            id: m.id || generateId(),
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          }));
        } catch {
          console.error('Failed to parse chat history');
        }
      }

      set({
        messages,
        currentSessionId: session.id,
        currentProjectId: session.project_id,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message, isLoading: false });
    }
  },

  saveSessionHistory: async () => {
    const { currentSessionId, messages } = get();
    if (!currentSessionId || messages.length === 0) return;

    try {
      // Serialize messages for storage
      const chatHistory = JSON.stringify(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls,
          toolResults: m.toolResults,
          createdAt: m.createdAt.toISOString(),
        }))
      );

      await fetch(`${API_BASE}/api/sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chat_history: chatHistory }),
      });
    } catch (err) {
      console.error('Failed to save session history:', err);
    }
  },

  createNewSession: async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/sessions`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      const session = data.session as ChatSession;

      set({
        currentSessionId: session.id,
        currentProjectId: projectId,
        messages: [],
        error: null,
      });

      return session;
    } catch (err) {
      console.error('Failed to create session:', err);
      return null;
    }
  },
}));
