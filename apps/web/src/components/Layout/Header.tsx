import { useChatStore } from '@/stores/chatStore';

export function Header() {
  const clearMessages = useChatStore((state) => state.clearMessages);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-dark-surface border-b border-dark-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <h1 className="text-lg font-semibold text-white">Claude Code Web</h1>
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={clearMessages}
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
        >
          New Chat
        </button>
      </nav>
    </header>
  );
}
