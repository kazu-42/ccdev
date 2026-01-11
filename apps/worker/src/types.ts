// Environment bindings
export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY: string;

  // KV Namespaces
  SESSIONS?: KVNamespace;

  // D1 Database
  DB?: D1Database;

  // Durable Objects
  TERMINAL_SESSION: DurableObjectNamespace;

  // Sandbox (when available)
  // SANDBOX: unknown;
}

// Message types
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolUse?: ToolUse;
}

export interface ToolUse {
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
}

// API Request/Response types
export interface ChatRequest {
  messages: Message[];
  model?: string;
}

export interface ExecuteRequest {
  code: string;
  language: 'javascript' | 'typescript';
  timeout?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// SSE Event types
export type SSEEventType = 'message' | 'tool_use' | 'tool_result' | 'done' | 'error';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

// Error types
export interface APIError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
