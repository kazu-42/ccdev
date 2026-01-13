// Environment bindings
export interface Env {
  // Environment variables
  ENVIRONMENT: string;
  ANTHROPIC_API_KEY: string;

  // Cloudflare Access configuration
  CF_ACCESS_TEAM_DOMAIN?: string; // e.g., https://ghive.cloudflareaccess.com
  CF_ACCESS_POLICY_AUD?: string; // Application Audience Tag

  // GitHub OAuth configuration
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  TOKEN_ENCRYPTION_KEY?: string; // 32-byte base64 key for AES-GCM

  // KV Namespaces
  SESSIONS?: KVNamespace;

  // D1 Database
  DB: D1Database;

  // Durable Objects
  TERMINAL_SESSION: DurableObjectNamespace;
  Sandbox: DurableObjectNamespace;
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
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  timeout?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// SSE Event types
export type SSEEventType =
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'done'
  | 'error';

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

// GitHub types
export interface GitHubConnection {
  id: string;
  userId: string;
  githubUserId: string;
  githubUsername: string;
  scopes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRepository {
  id: string;
  projectId: string;
  githubConnectionId: string;
  repoFullName: string;
  repoUrl: string;
  defaultBranch: string;
  clonePath: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  description: string | null;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  timestamp: number;
  message: string;
}
