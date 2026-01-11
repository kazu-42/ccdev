import type { ExecutionResult } from '../types';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface ExecutionOptions {
  timeout?: number;
}

export class SandboxService {
  /**
   * Execute code in sandbox
   * Note: This is a placeholder implementation.
   * Real implementation will use Cloudflare Sandbox SDK when available.
   */
  async execute(
    code: string,
    language: 'javascript' | 'typescript' | 'python' | 'bash',
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const startTime = Date.now();

    try {
      // TODO: Replace with actual Cloudflare Sandbox SDK implementation
      // const sandbox = await getSandbox(env.SANDBOX);
      // const result = await sandbox.exec('node', ['-e', code], { timeout });

      if (language === 'javascript') {
        return await this.executeJavaScript(code, timeout, startTime);
      }

      if (language === 'typescript') {
        // TypeScript requires compilation - run as JavaScript for now
        return await this.executeJavaScript(code, timeout, startTime);
      }

      if (language === 'python') {
        return this.mockExecution('python', code, startTime);
      }

      if (language === 'bash') {
        return this.mockExecution('bash', code, startTime);
      }

      return {
        stdout: '',
        stderr: `Unsupported language: ${language}`,
        exitCode: 1,
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

  private async executeJavaScript(
    code: string,
    timeout: number,
    startTime: number
  ): Promise<ExecutionResult> {
    let stdout = '';
    const originalLog = console.log;
    const originalError = console.error;
    let stderr = '';

    // Capture console.log output
    console.log = (...args: unknown[]) => {
      stdout += args.map(String).join(' ') + '\n';
    };
    console.error = (...args: unknown[]) => {
      stderr += args.map(String).join(' ') + '\n';
    };

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timed out')), timeout);
      });

      // Execute code with timeout
      const execPromise = new Promise<void>((resolve, reject) => {
        try {
          // Basic sandboxing: run in isolated function scope
          const fn = new Function(code);
          const result = fn();
          // If the function returns a promise, wait for it
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          } else {
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });

      await Promise.race([execPromise, timeoutPromise]);

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
        executionTime: Date.now() - startTime,
      };
    } catch (err) {
      const error = err as Error;
      return {
        stdout: stdout.trim(),
        stderr: error.message,
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  }

  /**
   * Mock execution for languages that aren't implemented yet
   * Returns a message indicating the code would be executed in a real sandbox
   */
  private mockExecution(
    language: string,
    code: string,
    startTime: number
  ): ExecutionResult {
    // In development/mock mode, show what would be executed
    const mockOutput = `[Mock ${language} execution]\n$ ${code.split('\n')[0]}${code.includes('\n') ? '\n...' : ''}\n\n[Sandbox execution not yet implemented. Connect to Cloudflare Sandbox for real execution.]`;

    return {
      stdout: mockOutput,
      stderr: '',
      exitCode: 0,
      executionTime: Date.now() - startTime,
    };
  }
}
