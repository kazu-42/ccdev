import { useChatStore } from '@/stores/chatStore';
import { useAppStore } from '@/stores/appStore';
import { useTerminalStore } from '@/stores/terminalStore';
import { ModeSelector } from './ModeSelector';

export function Header() {
  const clearMessages = useChatStore((state) => state.clearMessages);
  const resetTerminal = useTerminalStore((state) => state.reset);
  const mode = useAppStore((state) => state.mode);

  const handleNew = () => {
    if (mode === 'chat') {
      clearMessages();
    } else {
      resetTerminal();
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-dark-surface border-b border-dark-border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm font-mono">cc</span>
          </div>
          <h1 className="text-lg font-semibold text-white">ccdev</h1>
        </div>

        <div className="h-6 w-px bg-dark-border" />

        <ModeSelector />
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={handleNew}
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-dark-border rounded-lg transition-colors"
        >
          {mode === 'chat' ? 'New Chat' : 'New Session'}
        </button>
      </nav>
    </header>
  );
}
