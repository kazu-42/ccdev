import { getSandbox, type ISandbox } from '@cloudflare/sandbox';
import type { Env, ExecutionResult } from '../types';

export interface SandboxExecutionOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export class SandboxService {
  private sandbox: ISandbox | null = null;
  private useMock: boolean;

  constructor(
    private env: Env,
    private sandboxId: string = 'default'
  ) {
    // Use mock if Sandbox binding is not available
    this.useMock = !env.Sandbox;
  }

  /**
   * Get or create Sandbox instance (lazy initialization)
   */
  private async getSandboxInstance(): Promise<ISandbox> {
    if (!this.sandbox) {
      if (!this.env.Sandbox) {
        throw new Error('Sandbox binding not available');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.sandbox = getSandbox(this.env.Sandbox as any, this.sandboxId) as unknown as ISandbox;
    }
    return this.sandbox;
  }

  /**
   * Execute code in sandbox
   */
  async execute(
    code: string,
    language: 'javascript' | 'typescript' | 'python' | 'bash',
    options: SandboxExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Fall back to mock execution if Sandbox not available
    if (this.useMock) {
      return this.mockExecution(language, code, startTime);
    }

    try {
      const sandbox = await this.getSandboxInstance();
      let command: string;

      switch (language) {
        case 'javascript':
          command = `node -e ${this.shellEscape(code)}`;
          break;
        case 'typescript':
          // Bun can execute TypeScript directly
          command = `bun -e ${this.shellEscape(code)}`;
          break;
        case 'python':
          command = `python3 -c ${this.shellEscape(code)}`;
          break;
        case 'bash':
          command = code;
          break;
        default:
          return {
            stdout: '',
            stderr: `Unsupported language: ${language}`,
            exitCode: 1,
            executionTime: Date.now() - startTime,
          };
      }

      // Execute with optional cwd prefix
      const fullCommand = options.cwd
        ? `cd ${this.shellEscape(options.cwd)} && ${command}`
        : command;

      const result = await sandbox.exec(fullCommand, {
        timeout: options.timeout,
        env: options.env,
      });

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const err = error as Error;
      return {
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a shell command directly
   */
  async execCommand(
    command: string,
    options: SandboxExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (this.useMock) {
      return this.mockExecution('bash', command, startTime);
    }

    try {
      const sandbox = await this.getSandboxInstance();

      const fullCommand = options.cwd
        ? `cd ${this.shellEscape(options.cwd)} && ${command}`
        : command;

      const result = await sandbox.exec(fullCommand, {
        timeout: options.timeout,
        env: options.env,
      });

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const err = error as Error;
      return {
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Read file content from sandbox
   */
  async readFile(path: string): Promise<string> {
    if (this.useMock) {
      return `[Mock] Content of ${path} would be shown here`;
    }

    try {
      const sandbox = await this.getSandboxInstance();
      const result = await sandbox.readFile(path);

      if (!result.success) {
        throw new Error(`Failed to read file: exitCode ${result.exitCode}`);
      }
      return result.content;
    } catch (error) {
      throw new Error(`Failed to read file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Write content to a file in sandbox
   */
  async writeFile(path: string, content: string): Promise<void> {
    if (this.useMock) {
      console.log(`[Mock] Would write to ${path}`);
      return;
    }

    try {
      const sandbox = await this.getSandboxInstance();
      const result = await sandbox.writeFile(path, content);

      if (!result.success) {
        throw new Error(`Failed to write file: exitCode ${result.exitCode}`);
      }
    } catch (error) {
      throw new Error(`Failed to write file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<FileEntry[]> {
    if (this.useMock) {
      return [
        { name: 'example.js', type: 'file', size: 100 },
        { name: 'src', type: 'directory' },
      ];
    }

    try {
      const sandbox = await this.getSandboxInstance();
      const result = await sandbox.listFiles(path);

      if (!result.success) {
        throw new Error(`Failed to list directory: exitCode ${result.exitCode}`);
      }

      return result.files.map((f) => ({
        name: f.name,
        type: f.type === 'directory' ? 'directory' : 'file',
        size: f.size,
        modified: f.modifiedAt,
      }));
    } catch (error) {
      throw new Error(`Failed to list files in ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Create a directory
   */
  async mkdir(path: string, recursive: boolean = true): Promise<void> {
    if (this.useMock) {
      console.log(`[Mock] Would create directory ${path}`);
      return;
    }

    try {
      const sandbox = await this.getSandboxInstance();
      const result = await sandbox.mkdir(path, { recursive });

      if (!result.success) {
        throw new Error(`Failed to create directory: exitCode ${result.exitCode}`);
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    if (this.useMock) {
      console.log(`[Mock] Would delete ${path}`);
      return;
    }

    try {
      const sandbox = await this.getSandboxInstance();
      const result = await sandbox.deleteFile(path);

      if (!result.success) {
        throw new Error(`Failed to delete file: exitCode ${result.exitCode}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete file ${path}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(path: string): Promise<boolean> {
    if (this.useMock) {
      return true;
    }

    try {
      const sandbox = await this.getSandboxInstance();
      // Use test command to check existence
      const result = await sandbox.exec(`test -e ${this.shellEscape(path)} && echo "exists"`);
      return result.stdout.includes('exists');
    } catch {
      return false;
    }
  }

  /**
   * Shell escape a string for safe command execution
   */
  private shellEscape(str: string): string {
    // Use single quotes and escape any single quotes within
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Mock execution for development without Sandbox
   */
  private mockExecution(
    language: string,
    code: string,
    startTime: number
  ): ExecutionResult {
    const preview = code.split('\n')[0];
    const hasMore = code.includes('\n');

    const mockOutput = [
      `[Mock ${language} execution]`,
      `$ ${preview}${hasMore ? '\n...' : ''}`,
      '',
      '[Sandbox not available. Set up Cloudflare Sandbox binding for real execution.]',
    ].join('\n');

    return {
      stdout: mockOutput,
      stderr: '',
      exitCode: 0,
      executionTime: Date.now() - startTime,
    };
  }
}
