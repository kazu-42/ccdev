import { type AppMode, useAppStore } from '@/stores/appStore';

const modes: { id: AppMode; label: string; icon: string }[] = [
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'chat', label: 'Chat', icon: '@' },
];

export function ModeSelector() {
  const { mode, setMode } = useAppStore();

  return (
    <div className="flex items-center bg-dark-bg rounded-lg p-0.5">
      {modes.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all
            ${
              mode === id
                ? 'bg-dark-surface text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }
          `}
        >
          <span className="font-mono text-xs opacity-60">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
