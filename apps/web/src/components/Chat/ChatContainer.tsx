import { useChatStore } from '@/stores/chatStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

export function ChatContainer() {
  const { messages, isLoading, error, streamingContent } = useChatStore();

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      <InputArea />
    </div>
  );
}
