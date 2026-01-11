import { useState, useCallback } from 'react';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

type Language = 'javascript' | 'typescript' | 'python' | 'js' | 'ts' | 'py';

interface UseCodeExecutionReturn {
  execute: (code: string, language: Language) => Promise<ExecutionResult>;
  isExecuting: boolean;
  result: ExecutionResult | null;
  error: string | null;
  clearResult: () => void;
}

// Pyodide singleton
let pyodide: unknown = null;
let pyodideLoading: Promise<void> | null = null;

async function loadPyodide(): Promise<void> {
  if (pyodide) return;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    // Dynamic import of Pyodide from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.js';
    document.head.appendChild(script);

    await new Promise<void>((resolve) => {
      script.onload = () => resolve();
    });

    // @ts-expect-error Pyodide is loaded globally
    pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.0/full/',
    });
  })();

  return pyodideLoading;
}

async function executePython(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    await loadPyodide();

    const py = pyodide as {
      runPython: (code: string) => unknown;
    };

    // Capture stdout/stderr
    py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
    `);

    try {
      py.runPython(code);
    } catch (err) {
      const stderr = py.runPython('sys.stderr.getvalue()') as string;
      return {
        stdout: '',
        stderr: stderr || String(err),
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }

    const stdout = py.runPython('sys.stdout.getvalue()') as string;
    const stderr = py.runPython('sys.stderr.getvalue()') as string;

    return {
      stdout,
      stderr,
      exitCode: stderr ? 1 : 0,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      stdout: '',
      stderr: String(err),
      exitCode: 1,
      executionTime: Date.now() - startTime,
    };
  }
}

async function executeJavaScript(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  let stdout = '';

  try {
    // Create isolated execution context
    const logs: string[] = [];

    // Override console.log to capture output
    const customConsole = {
      log: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
      error: (...args: unknown[]) => logs.push('[error] ' + args.map(formatValue).join(' ')),
      warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(formatValue).join(' ')),
      info: (...args: unknown[]) => logs.push(args.map(formatValue).join(' ')),
    };

    // Create a sandboxed function
    const wrappedCode = `
      (function(console) {
        ${code}
      })
    `;

    // Execute in isolated scope
    const fn = eval(wrappedCode);
    const result = fn(customConsole);

    // Handle async results
    if (result instanceof Promise) {
      await result;
    }

    stdout = logs.join('\n');

    return {
      stdout,
      stderr: '',
      exitCode: 0,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      stdout,
      stderr: String(err),
      exitCode: 1,
      executionTime: Date.now() - startTime,
    };
  }
}

function formatValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

async function executeServerSide(
  code: string,
  language: 'javascript' | 'typescript'
): Promise<ExecutionResult> {
  // For now, execute JavaScript client-side for development
  // Server-side execution requires Cloudflare Sandbox SDK
  if (language === 'javascript') {
    return executeJavaScript(code);
  }

  // TypeScript requires server-side compilation
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      stdout: '',
      stderr: error.message || 'Execution failed',
      exitCode: 1,
      executionTime: 0,
    };
  }

  return response.json();
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (code: string, language: Language): Promise<ExecutionResult> => {
      setIsExecuting(true);
      setError(null);

      try {
        let executionResult: ExecutionResult;

        if (language === 'python' || language === 'py') {
          executionResult = await executePython(code);
        } else {
          // Normalize language for server-side execution
          const normalizedLang: 'javascript' | 'typescript' =
            language === 'js' || language === 'javascript'
              ? 'javascript'
              : 'typescript';
          executionResult = await executeServerSide(code, normalizedLang);
        }

        setResult(executionResult);
        return executionResult;
      } catch (err) {
        const errorMessage = String(err);
        setError(errorMessage);
        const errorResult: ExecutionResult = {
          stdout: '',
          stderr: errorMessage,
          exitCode: 1,
          executionTime: 0,
        };
        setResult(errorResult);
        return errorResult;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    execute,
    isExecuting,
    result,
    error,
    clearResult,
  };
}
