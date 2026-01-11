import { Streamdown } from 'streamdown';
import type { Message } from '@/stores/chatStore';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary-600' : 'bg-gradient-to-br from-primary-500 to-primary-700'
        }`}
      >
        <span className="text-white text-sm font-medium font-mono">
          {isUser ? 'U' : 'cc'}
        </span>
      </div>

      {/* Message content */}
      <div
        className={`flex-1 max-w-[85%] ${
          isUser ? 'text-right' : 'text-left'
        }`}
      >
        <div
          className={`inline-block px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-dark-surface text-gray-100'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none streamdown-content">
              <Streamdown>
                {message.content}
              </Streamdown>
              {isStreaming && !message.content && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
              )}
              {isStreaming && message.content && (
                <span className="typing-cursor" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
