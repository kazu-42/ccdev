import type { ExecutionResult } from '../types';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface ExecutionOptions {
  timeout?: number;
}

export class SandboxService {
  /**
   * Execute JavaScript/TypeScript code in sandbox
   * Note: This is a placeholder implementation.
   * Real implementation will use Cloudflare Sandbox SDK when available.
   */
  async execute(
    code: string,
    language: 'javascript' | 'typescript',
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const startTime = Date.now();

    try {
      // TODO: Replace with actual Cloudflare Sandbox SDK implementation
      // const sandbox = await getSandbox(env.SANDBOX);
      // const result = await sandbox.exec('node', ['-e', code], { timeout });

      // Temporary: Use eval for basic JavaScript (NOT SAFE FOR PRODUCTION)
      // This is just for development/testing purposes
      if (language === 'javascript') {
        let stdout = '';
        const originalLog = console.log;

        // Capture console.log output
        console.log = (...args: unknown[]) => {
          stdout += args.map(String).join(' ') + '\n';
        };

        try {
          // Create a timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Execution timed out')), timeout);
          });

          // Execute code with timeout
          const execPromise = new Promise<void>((resolve) => {
            try {
              // Basic sandboxing: run in isolated function scope
              const fn = new Function(code);
              fn();
              resolve();
            } catch (err) {
              throw err;
            }
          });

          await Promise.race([execPromise, timeoutPromise]);

          return {
            stdout,
            stderr: '',
            exitCode: 0,
            executionTime: Date.now() - startTime,
          };
        } finally {
          console.log = originalLog;
        }
      }

      // TypeScript requires compilation - not implemented yet
      return {
        stdout: '',
        stderr: 'TypeScript execution not yet implemented. Please use JavaScript.',
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
}
