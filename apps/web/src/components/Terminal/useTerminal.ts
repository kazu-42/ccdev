import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTerminalStore } from '@/stores/terminalStore';

interface UseTerminalOptions {
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function useTerminal(containerRef: React.RefObject<HTMLDivElement>, options: UseTerminalOptions = {}) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { setConnectionStatus, setError } = useTerminalStore();

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#e4e4e7',
        cursor: '#e94560',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#3d3d5c',
        black: '#1a1a2e',
        red: '#e94560',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#ff6b6b',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#fafafa',
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle user input
    terminal.onData((data) => {
      options.onData?.(data);
      // Send to WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      const { cols, rows } = terminal;
      options.onResize?.(cols, rows);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);

    // Initial welcome message
    terminal.writeln('\x1b[1;36m╭──────────────────────────────────────╮\x1b[0m');
    terminal.writeln('\x1b[1;36m│\x1b[0m   \x1b[1;37mccdev\x1b[0m - Web Terminal             \x1b[1;36m│\x1b[0m');
    terminal.writeln('\x1b[1;36m│\x1b[0m   Cloudflare Sandbox Environment   \x1b[1;36m│\x1b[0m');
    terminal.writeln('\x1b[1;36m╰──────────────────────────────────────╯\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[33mConnecting to sandbox...\x1b[0m');
    terminal.writeln('');

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerRef, options]);

  // Connect to WebSocket
  const connect = useCallback((sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    // Use configured WS URL or fall back to current host
    const wsBaseUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const wsUrl = `${wsBaseUrl}/ws/terminal/${sessionId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        terminalRef.current?.writeln('\x1b[32mConnected!\x1b[0m');
        terminalRef.current?.writeln('');
        // Send initial resize
        if (terminalRef.current) {
          const { cols, rows } = terminalRef.current;
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output' && message.data) {
            terminalRef.current?.write(message.data);
          } else if (message.type === 'error' && message.data) {
            terminalRef.current?.writeln(`\x1b[31m${message.data}\x1b[0m`);
          } else if (message.type === 'exit') {
            terminalRef.current?.writeln(`\x1b[33mProcess exited with code ${message.exitCode}\x1b[0m`);
          }
        } catch {
          // Raw output (non-JSON)
          terminalRef.current?.write(event.data);
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        terminalRef.current?.writeln('\x1b[31mConnection error\x1b[0m');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        terminalRef.current?.writeln('\x1b[33mDisconnected from sandbox\x1b[0m');
        wsRef.current = null;
      };
    } catch (err) {
      setError(`Failed to connect: ${err}`);
    }
  }, [setConnectionStatus, setError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Write to terminal
  const write = useCallback((data: string) => {
    terminalRef.current?.write(data);
  }, []);

  // Write line to terminal
  const writeln = useCallback((data: string) => {
    terminalRef.current?.writeln(data);
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  // Focus terminal
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  // Fit terminal to container
  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return {
    terminal: terminalRef.current,
    connect,
    disconnect,
    write,
    writeln,
    clear,
    focus,
    fit,
  };
}
