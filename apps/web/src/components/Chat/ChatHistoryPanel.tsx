import { useEffect } from 'react';
import { useChatStore, type ChatSession } from '@/stores/chatStore';
import { useProjectStore } from '@/stores/projectStore';

export function ChatHistoryPanel() {
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    loadSessions,
    loadSession,
    createNewSession,
    clearMessages,
  } = useChatStore();
  const { currentProject } = useProjectStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewSession = async () => {
    if (currentProject) {
      clearMessages();
      await createNewSession(currentProject.id);
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    loadSession(session.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getSessionPreview = (session: ChatSession) => {
    if (!session.chat_history) return 'No messages';
    try {
      const messages = JSON.parse(session.chat_history);
      if (messages.length === 0) return 'No messages';
      const firstMessage = messages[0];
      const preview = firstMessage.content?.slice(0, 50) || 'No content';
      return preview.length < (firstMessage.content?.length || 0)
        ? `${preview}...`
        : preview;
    } catch {
      return 'No messages';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Session Button */}
      <div className="p-3 border-b border-dark-border">
        <button
          onClick={handleNewSession}
          disabled={!currentProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Chat
        </button>
        {!currentProject && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Select a project to start a chat
          </p>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <p>No chat sessions yet.</p>
            <p className="text-xs mt-1">Start a new chat to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleLoadSession(session)}
                className={`w-full text-left p-3 hover:bg-dark-bg/50 transition-colors ${
                  currentSessionId === session.id ? 'bg-dark-bg/80 border-l-2 border-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-primary-400 font-medium truncate">
                        {session.project_name || 'Unknown Project'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 truncate">
                      {getSessionPreview(session)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(session.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="p-2 border-t border-dark-border">
        <button
          onClick={() => loadSessions()}
          disabled={sessionsLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-3.5 h-3.5 ${sessionsLoading ? 'animate-spin' : ''}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}
