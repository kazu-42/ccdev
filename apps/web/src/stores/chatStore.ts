import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  appendStreamContent: (content: string) => void;
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

  sendMessage: async (content: string) => {
    const { messages } = get();

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
    });

    try {
      // Prepare messages for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                get().appendStreamContent(data.content);
              }
            } catch {
              // Skip invalid JSON
            }
          } else if (line.startsWith('event: done')) {
            get().finalizeMessage();
          } else if (line.startsWith('event: error')) {
            // Handle error event
          }
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

  finalizeMessage: () => {
    const { messages, streamingContent } = get();

    if (streamingContent) {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: streamingContent,
        createdAt: new Date(),
      };

      set({
        messages: [...messages, assistantMessage],
        streamingContent: '',
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null, streamingContent: '' });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },
}));
