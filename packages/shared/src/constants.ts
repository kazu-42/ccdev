/**
 * Default AI model
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Maximum tokens for AI response
 */
export const MAX_TOKENS = 4096;

/**
 * Default code execution timeout (ms)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Maximum code length (characters)
 */
export const MAX_CODE_LENGTH = 100000;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  EXECUTE: '/api/execute',
  HEALTH: '/health',
} as const;

/**
 * Supported languages for code execution
 */
export const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python'] as const;

/**
 * Languages that can be executed server-side
 */
export const SERVER_EXECUTABLE_LANGUAGES = ['javascript', 'typescript'] as const;

/**
 * Languages that run client-side (Pyodide)
 */
export const CLIENT_EXECUTABLE_LANGUAGES = ['python'] as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;
