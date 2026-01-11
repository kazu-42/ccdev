import type { Env } from '../types';

interface ClientMessage {
  type: 'input' | 'resize';
  data?: string;
  cols?: number;
  rows?: number;
}

interface ServerMessage {
  type: 'output' | 'error' | 'exit';
  data?: string;
  exitCode?: number;
}

export class TerminalSession {
  private websockets: Set<WebSocket> = new Set();
  private terminalCols: number = 80;
  private terminalRows: number = 24;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  // Getters for Phase 3 Sandbox integration
  get cols(): number {
    return this.terminalCols;
  }

  get rows(): number {
    return this.terminalRows;
  }

  get storage(): DurableObjectStorage {
    return this.state.storage;
  }

  get environment(): Env {
    return this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private handleWebSocket(request: Request): Response {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.websockets.add(server);

    server.accept();

    server.addEventListener('message', async (event) => {
      await this.handleMessage(server, event.data);
    });

    server.addEventListener('close', () => {
      this.websockets.delete(server);
    });

    server.addEventListener('error', () => {
      this.websockets.delete(server);
    });

    // Send welcome message
    this.send(server, {
      type: 'output',
      data: '\x1b[32mConnected to ccdev sandbox\x1b[0m\r\n',
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    try {
      const message: ClientMessage =
        typeof data === 'string' ? JSON.parse(data) : JSON.parse(new TextDecoder().decode(data));

      switch (message.type) {
        case 'input':
          await this.handleInput(ws, message.data || '');
          break;
        case 'resize':
          if (message.cols && message.rows) {
            this.terminalCols = message.cols;
            this.terminalRows = message.rows;
          }
          break;
        default:
          this.send(ws, { type: 'error', data: 'Unknown message type' });
      }
    } catch (err) {
      this.send(ws, { type: 'error', data: `Parse error: ${err}` });
    }
  }

  private async handleInput(ws: WebSocket, input: string): Promise<void> {
    // For now, just echo input back (Phase 3 will integrate Sandbox SDK)
    // This is a simple shell simulator for testing
    this.send(ws, { type: 'output', data: input });

    // Handle Enter key
    if (input === '\r' || input === '\n') {
      this.send(ws, { type: 'output', data: '\n$ ' });
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all connected clients (used in Phase 3)
  public broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.websockets) {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(data);
      }
    }
  }
}
