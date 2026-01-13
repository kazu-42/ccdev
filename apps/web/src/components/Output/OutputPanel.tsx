import type { ExecutionResult } from '@/hooks/useCodeExecution';

interface OutputPanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
  onClose?: () => void;
}

export function OutputPanel({
  result,
  isExecuting,
  onClose,
}: OutputPanelProps) {
  if (!result && !isExecuting) return null;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden mt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Output</span>
          {isExecuting && (
            <div className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          )}
          {result && !isExecuting && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                result.exitCode === 0
                  ? 'bg-green-900/50 text-green-400'
                  : 'bg-red-900/50 text-red-400'
              }`}
            >
              {result.exitCode === 0 ? 'Success' : `Exit: ${result.exitCode}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className="text-xs text-gray-500">
              {result.executionTime}ms
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 max-h-60 overflow-auto">
        {isExecuting && !result && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-sm">Executing...</span>
          </div>
        )}

        {result?.stdout && (
          <pre className="text-sm text-gray-200 font-mono whitespace-pre-wrap mb-2">
            {result.stdout}
          </pre>
        )}

        {result?.stderr && (
          <pre className="text-sm text-red-400 font-mono whitespace-pre-wrap">
            {result.stderr}
          </pre>
        )}

        {result && !result.stdout && !result.stderr && (
          <span className="text-sm text-gray-500 italic">No output</span>
        )}
      </div>
    </div>
  );
}
