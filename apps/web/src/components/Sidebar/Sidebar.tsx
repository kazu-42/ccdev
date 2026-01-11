import { useAppStore } from '@/stores/appStore';
import { FileTree } from './FileTree';

export function Sidebar() {
  const { activeActivity, sidebarWidth } = useAppStore();

  if (!activeActivity) {
    return null;
  }

  const titles: Record<string, string> = {
    files: 'EXPLORER',
    chat: 'AI CHAT',
    terminal: 'TERMINAL',
    settings: 'SETTINGS',
  };

  return (
    <div
      className="flex flex-col bg-dark-surface border-r border-dark-border"
      style={{ width: sidebarWidth }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 h-9 border-b border-dark-border">
        <span className="text-xs font-medium text-gray-400 tracking-wider">
          {titles[activeActivity]}
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeActivity === 'files' && <FileTree />}
        {activeActivity === 'chat' && (
          <div className="p-4 text-sm text-gray-400">
            <p>AI Chat sessions will appear here.</p>
          </div>
        )}
        {activeActivity === 'terminal' && (
          <div className="p-4 text-sm text-gray-400">
            <p>Terminal sessions will appear here.</p>
          </div>
        )}
        {activeActivity === 'settings' && (
          <div className="p-4 text-sm text-gray-400">
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Theme</h3>
                <select className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1 text-sm">
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">Font Size</h3>
                <input
                  type="range"
                  min="12"
                  max="20"
                  defaultValue="14"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
