// Message types shared between frontend and backend

/**
 * Chat message
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUse?: ToolUse;
  createdAt: Date;
}

/**
 * Tool use information
 */
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: ExecutionResult;
}

/**
 * Code execution result
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Supported programming languages
 */
export type Language = 'javascript' | 'typescript' | 'python';

/**
 * Chat API request
 */
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
}

/**
 * Code execution API request
 */
export interface ExecuteRequest {
  code: string;
  language: Language;
  timeout?: number;
}

/**
 * SSE event types
 */
export type SSEEventType = 'message' | 'tool_use' | 'tool_result' | 'done' | 'error';

/**
 * SSE event data
 */
export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

/**
 * API error response
 */
export interface APIError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}
