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

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  currentToolCalls: ToolCall[];
  currentToolResults: ToolResult[];

  // Actions
  sendMessage: (content: string) => Promise<void>;
  appendStreamContent: (content: string) => void;
  addToolCall: (toolCall: ToolCall) => void;
  addToolResult: (result: ToolResult) => void;
  finalizeMessage: () => void;
  clearMessages: () => void;
  setError: (error: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  streamingContent: '',
  currentToolCalls: [],
  currentToolResults: [],

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
}));
