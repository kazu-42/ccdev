import { useAppStore } from '@/stores/appStore';
import { useProjectStore } from '@/stores/projectStore';
import { FileTree } from './FileTree';
import { ProjectSelector } from '@/components/Project/ProjectSelector';
import { SettingsPanel } from '@/components/Settings/SettingsPanel';
import { ChatHistoryPanel } from '@/components/Chat/ChatHistoryPanel';
import { GitPanel } from '@/components/Git';

export function Sidebar() {
  const { activeActivity, sidebarWidth } = useAppStore();
  const { currentProject, currentSession } = useProjectStore();

  if (!activeActivity) {
    return null;
  }

  const titles: Record<string, string> = {
    files: 'EXPLORER',
    chat: 'AI CHAT',
    terminal: 'TERMINAL',
    settings: 'SETTINGS',
    git: 'SOURCE CONTROL',
  };

  return (
    <div
      className="flex flex-col bg-dark-surface border-r border-dark-border"
      style={{ width: sidebarWidth }}
    >
      {/* Project Selector */}
      <div className="px-3 py-3 border-b border-dark-border">
        <ProjectSelector />
      </div>

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
        {activeActivity === 'chat' && <ChatHistoryPanel />}
        {activeActivity === 'terminal' && (
          <div className="p-4 text-sm text-gray-400 space-y-3">
            {currentProject ? (
              <>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Current Project</div>
                  <div className="text-white font-medium">{currentProject.name}</div>
                </div>
                {currentSession && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Session ID</div>
                    <div className="text-xs font-mono text-gray-400">{currentSession.terminal_session_id}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500 mb-1">Sandbox ID</div>
                  <div className="text-xs font-mono text-gray-400">{currentProject.sandbox_id}</div>
                </div>
              </>
            ) : (
              <p>Select a project to start a terminal session.</p>
            )}
          </div>
        )}
        {activeActivity === 'settings' && <SettingsPanel />}
        {activeActivity === 'git' && <GitPanel />}
      </div>
    </div>
  );
}
