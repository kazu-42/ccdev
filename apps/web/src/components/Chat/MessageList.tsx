import { useEffect, useRef } from 'react';
import type { Message } from '@/stores/chatStore';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  isLoading: boolean;
}

export function MessageList({
  messages,
  streamingContent,
  isLoading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <span className="text-2xl text-white font-bold font-mono">cc</span>
        </div>
        <h2 className="text-xl font-medium text-white mb-2">ccdev Chat</h2>
        <p className="text-sm text-center max-w-md">
          AIとチャットしながらコードを実行できます。
          <br />
          何か質問してみてください。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 px-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* Streaming message */}
      {(isLoading || streamingContent) && (
        <MessageItem
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            createdAt: new Date(),
          }}
          isStreaming={isLoading}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
