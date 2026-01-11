import type { Env } from '../types';
import { getSandbox } from '@cloudflare/sandbox';

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
  private inputBuffer: string = '';
  private cwd: string = '/workspace';
  private history: string[] = [];
  private historyIndex: number = -1;

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

    // Send welcome message and prompt
    this.send(server, {
      type: 'output',
      data: this.getPrompt(),
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
    // Handle special keys
    if (input === '\r' || input === '\n') {
      // Enter key - execute command
      this.send(ws, { type: 'output', data: '\r\n' });
      await this.executeCommand(ws, this.inputBuffer.trim());
      this.inputBuffer = '';
      this.historyIndex = -1;
      this.send(ws, { type: 'output', data: this.getPrompt() });
    } else if (input === '\x7f' || input === '\b') {
      // Backspace
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.send(ws, { type: 'output', data: '\b \b' });
      }
    } else if (input === '\x03') {
      // Ctrl+C
      this.inputBuffer = '';
      this.send(ws, { type: 'output', data: '^C\r\n' + this.getPrompt() });
    } else if (input === '\x1b[A') {
      // Up arrow - history
      if (this.history.length > 0 && this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.replaceInputLine(ws, this.history[this.history.length - 1 - this.historyIndex]);
      }
    } else if (input === '\x1b[B') {
      // Down arrow - history
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.replaceInputLine(ws, this.history[this.history.length - 1 - this.historyIndex]);
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.replaceInputLine(ws, '');
      }
    } else if (input.length === 1 && input >= ' ') {
      // Regular character
      this.inputBuffer += input;
      this.send(ws, { type: 'output', data: input });
    }
  }

  private replaceInputLine(ws: WebSocket, newInput: string): void {
    // Clear current line and write new input
    const clearLine = '\r' + this.getPrompt() + ' '.repeat(this.inputBuffer.length) + '\r' + this.getPrompt();
    this.inputBuffer = newInput;
    this.send(ws, { type: 'output', data: clearLine + newInput });
  }

  private async executeCommand(ws: WebSocket, command: string): Promise<void> {
    if (!command) return;

    // Add to history
    if (command !== this.history[this.history.length - 1]) {
      this.history.push(command);
      if (this.history.length > 100) {
        this.history.shift();
      }
    }

    const parts = command.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    // Built-in shell commands (emulated)
    switch (cmd) {
      case 'echo':
        this.send(ws, { type: 'output', data: args.join(' ') + '\r\n' });
        break;

      case 'pwd':
        this.send(ws, { type: 'output', data: this.cwd + '\r\n' });
        break;

      case 'cd':
        this.handleCd(ws, args[0]);
        break;

      case 'ls':
        this.handleLs(ws, args);
        break;

      case 'cat':
        this.handleCat(ws, args);
        break;

      case 'help':
        this.sendHelp(ws);
        break;

      case 'clear':
        this.send(ws, { type: 'output', data: '\x1b[2J\x1b[H' });
        break;

      case 'whoami':
        this.send(ws, { type: 'output', data: 'sandbox\r\n' });
        break;

      case 'hostname':
        this.send(ws, { type: 'output', data: 'ccdev-sandbox\r\n' });
        break;

      case 'date':
        this.send(ws, { type: 'output', data: new Date().toUTCString() + '\r\n' });
        break;

      case 'env':
        this.send(ws, {
          type: 'output',
          data: `SHELL=/bin/bash\r\nPWD=${this.cwd}\r\nHOME=/workspace\r\nTERM=xterm-256color\r\nUSER=sandbox\r\n`,
        });
        break;

      case 'uname':
        if (args.includes('-a')) {
          this.send(ws, {
            type: 'output',
            data: 'Linux ccdev-sandbox 5.15.0 #1 SMP PREEMPT Cloudflare x86_64 GNU/Linux\r\n',
          });
        } else {
          this.send(ws, { type: 'output', data: 'Linux\r\n' });
        }
        break;

      default:
        // Check if Sandbox SDK is available
        if (this.env.Sandbox) {
          await this.executeSandboxCommand(ws, command);
        } else {
          this.send(ws, {
            type: 'output',
            data: `\x1b[33mccdev:\x1b[0m ${cmd}: command not found\r\n` +
              `\x1b[90m(Sandbox SDK not enabled. Use 'help' for available commands)\x1b[0m\r\n`,
          });
        }
    }
  }

  private handleCd(_ws: WebSocket, dir?: string): void {
    if (!dir || dir === '~') {
      this.cwd = '/workspace';
    } else if (dir === '..') {
      const parts = this.cwd.split('/').filter(Boolean);
      parts.pop();
      this.cwd = '/' + parts.join('/') || '/';
    } else if (dir.startsWith('/')) {
      this.cwd = dir;
    } else {
      this.cwd = this.cwd === '/' ? '/' + dir : this.cwd + '/' + dir;
    }
  }

  private handleLs(ws: WebSocket, args: string[]): void {
    // Emulated file system
    const files: Record<string, string[]> = {
      '/': ['workspace', 'home', 'tmp'],
      '/workspace': ['README.md', 'package.json', 'src'],
      '/workspace/src': ['index.ts', 'utils.ts'],
      '/home': [],
      '/tmp': [],
    };

    const targetDir = args[0] ? (args[0].startsWith('/') ? args[0] : this.cwd + '/' + args[0]) : this.cwd;
    const contents = files[targetDir];

    if (contents) {
      if (contents.length === 0) {
        return; // Empty directory, no output
      }
      const output = args.includes('-l')
        ? contents.map((f) => `drwxr-xr-x  1 sandbox sandbox 4096 Jan 11 10:00 ${f}`).join('\r\n')
        : contents.join('  ');
      this.send(ws, { type: 'output', data: output + '\r\n' });
    } else {
      this.send(ws, {
        type: 'output',
        data: `ls: cannot access '${args[0] || targetDir}': No such file or directory\r\n`,
      });
    }
  }

  private handleCat(ws: WebSocket, args: string[]): void {
    if (!args[0]) {
      return;
    }

    // Emulated file contents
    const files: Record<string, string> = {
      '/workspace/README.md': '# ccdev Sandbox\\n\\nWelcome to the ccdev sandbox environment.\\n',
      '/workspace/package.json': '{\\n  "name": "sandbox-project",\\n  "version": "1.0.0"\\n}\\n',
      '/workspace/src/index.ts': 'console.log("Hello from ccdev sandbox!");\\n',
      '/workspace/src/utils.ts': 'export function greet(name: string) {\\n  return `Hello, ${name}!`;\\n}\\n',
    };

    const filePath = args[0].startsWith('/') ? args[0] : this.cwd + '/' + args[0];
    const content = files[filePath];

    if (content) {
      this.send(ws, { type: 'output', data: content.replace(/\\n/g, '\r\n') });
    } else {
      this.send(ws, { type: 'output', data: `cat: ${args[0]}: No such file or directory\r\n` });
    }
  }

  private sendHelp(ws: WebSocket): void {
    const help = `
\x1b[1;36mccdev - Web Terminal\x1b[0m

\x1b[1mAvailable Commands:\x1b[0m
  echo <text>    Print text to terminal
  pwd            Print current directory
  cd <dir>       Change directory
  ls [-l] [dir]  List directory contents
  cat <file>     Display file contents
  clear          Clear terminal screen
  whoami         Print current user
  hostname       Print hostname
  date           Print current date/time
  env            Print environment variables
  uname [-a]     Print system information
  help           Show this help message

\x1b[90mNote: This is an emulated shell. Full Sandbox SDK commands
will be available when Sandbox is enabled.\x1b[0m
`;
    this.send(ws, { type: 'output', data: help.trim().replace(/\n/g, '\r\n') + '\r\n' });
  }

  private async executeSandboxCommand(ws: WebSocket, command: string): Promise<void> {
    try {
      const sandbox = await getSandbox(this.env.Sandbox);

      const result = await sandbox.exec('bash', ['-c', command], {
        timeout: 30000,
        cwd: this.cwd,
        env: {
          TERM: 'xterm-256color',
          HOME: '/workspace',
          USER: 'sandbox',
          SHELL: '/bin/bash',
        },
        onOutput: (chunk: string) => {
          // Stream output in real-time
          this.send(ws, { type: 'output', data: chunk.replace(/\n/g, '\r\n') });
        },
      });

      // Send exit code if non-zero
      if (result.exitCode !== 0) {
        this.send(ws, {
          type: 'exit',
          exitCode: result.exitCode
        });
      }

      // Update cwd if command was cd
      if (command.trim().startsWith('cd ')) {
        // Try to get the new directory
        const cdResult = await sandbox.exec('bash', ['-c', 'pwd'], {
          timeout: 5000,
          cwd: this.cwd,
        });
        if (cdResult.exitCode === 0 && cdResult.stdout) {
          this.cwd = cdResult.stdout.trim();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.send(ws, {
        type: 'error',
        data: `\x1b[31mSandbox error:\x1b[0m ${errorMessage}\r\n`,
      });
    }
  }

  private getPrompt(): string {
    const shortCwd = this.cwd === '/workspace' ? '~' : this.cwd.replace('/workspace', '~');
    return `\x1b[32msandbox\x1b[0m:\x1b[34m${shortCwd}\x1b[0m$ `;
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.READY_STATE_OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast to all connected clients
  public broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.websockets) {
      if (ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(data);
      }
    }
  }
}
