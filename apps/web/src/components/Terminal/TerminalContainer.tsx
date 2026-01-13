import { useEffect, useRef } from 'react';
import { useTerminalStore } from '@/stores/terminalStore';
import { useTerminal } from './useTerminal';
import '@xterm/xterm/css/xterm.css';

export function TerminalContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { sessionId, connectionStatus, error, setSessionId, reset } =
    useTerminalStore();
  const { connect, disconnect, fit, focus } = useTerminal(containerRef);

  // Generate session ID on mount
  useEffect(() => {
    if (!sessionId) {
      setSessionId(Math.random().toString(36).substring(2, 15));
    }
  }, [sessionId, setSessionId]);

  // Connect when session ID is available
  useEffect(() => {
    if (sessionId && connectionStatus === 'disconnected') {
      // Delay connection to allow terminal to initialize
      const timer = setTimeout(() => {
        connect(sessionId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sessionId, connectionStatus, connect]);

  // Fit terminal when container size changes
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      fit();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [fit]);

  // Focus terminal when clicking container
  const handleClick = () => {
    focus();
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-surface border-b border-dark-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
              }`}
            />
            <span className="text-xs text-gray-400">
              {connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : connectionStatus === 'error'
                    ? 'Error'
                    : 'Disconnected'}
            </span>
          </div>
          {sessionId && (
            <span className="text-xs text-gray-500 font-mono">
              Session: {sessionId.substring(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {connectionStatus === 'error' && (
            <button
              onClick={() => {
                reset();
              }}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Reconnect
            </button>
          )}
          {connectionStatus === 'connected' && (
            <button
              onClick={disconnect}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Terminal */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="flex-1 p-2 overflow-hidden cursor-text"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
