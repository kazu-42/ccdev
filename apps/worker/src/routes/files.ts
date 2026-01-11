// File System Routes for ccdev
import { Hono } from 'hono';
import type { Env } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getCurrentUser } from '../middleware/authorize';
import { projectQueries } from '../db/queries';
import { getSandbox } from '@cloudflare/sandbox';

const files = new Hono<{ Bindings: Env }>();

// All file routes require authentication
files.use('*', authMiddleware);

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  path: string;
}

// List files in a directory
files.get('/projects/:projectId/list', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path') || '/workspace';
  const user = getCurrentUser(c);

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  // Check if Sandbox SDK is available
  if (!c.env.Sandbox) {
    // Return mock data when sandbox is not available
    return c.json({
      path,
      entries: getMockFiles(path),
    });
  }

  try {
    const sandboxId = project.sandbox_id || projectId.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox = getSandbox(c.env.Sandbox as any, sandboxId);

    // Use ls -la to get detailed file listing
    const result = await sandbox.exec(`ls -la "${path}" 2>/dev/null || echo "[]"`);

    if (result.exitCode !== 0) {
      return c.json({ error: 'Failed to list files', message: result.stderr }, 500);
    }

    const entries = parseLsOutput(result.stdout, path);
    return c.json({ path, entries });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Sandbox error', message: errorMessage }, 500);
  }
});

// Read file content
files.get('/projects/:projectId/read', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path');
  const user = getCurrentUser(c);

  if (!path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  // Check if Sandbox SDK is available
  if (!c.env.Sandbox) {
    const mockContent = getMockFileContent(path);
    if (mockContent === null) {
      return c.json({ error: 'Not Found', message: 'File not found' }, 404);
    }
    return c.json({ path, content: mockContent });
  }

  try {
    const sandboxId = project.sandbox_id || projectId.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox = getSandbox(c.env.Sandbox as any, sandboxId);

    const result = await sandbox.exec(`cat "${path}"`);

    if (result.exitCode !== 0) {
      return c.json({ error: 'Failed to read file', message: result.stderr }, 404);
    }

    return c.json({ path, content: result.stdout });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Sandbox error', message: errorMessage }, 500);
  }
});

// Write file content
files.post('/projects/:projectId/write', async (c) => {
  const projectId = c.req.param('projectId');
  const user = getCurrentUser(c);

  const body = await c.req.json<{ path: string; content: string }>();
  if (!body.path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  // Check if Sandbox SDK is available
  if (!c.env.Sandbox) {
    return c.json({ success: true, path: body.path, message: 'Mock write (sandbox not available)' });
  }

  try {
    const sandboxId = project.sandbox_id || projectId.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox = getSandbox(c.env.Sandbox as any, sandboxId);

    // Escape content for shell and use cat with heredoc
    const escapedContent = body.content.replace(/'/g, "'\\''");
    const result = await sandbox.exec(`cat > "${body.path}" << 'CCDEV_EOF'\n${escapedContent}\nCCDEV_EOF`);

    if (result.exitCode !== 0) {
      return c.json({ error: 'Failed to write file', message: result.stderr }, 500);
    }

    return c.json({ success: true, path: body.path });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Sandbox error', message: errorMessage }, 500);
  }
});

// Create directory
files.post('/projects/:projectId/mkdir', async (c) => {
  const projectId = c.req.param('projectId');
  const user = getCurrentUser(c);

  const body = await c.req.json<{ path: string }>();
  if (!body.path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  if (!c.env.Sandbox) {
    return c.json({ success: true, path: body.path, message: 'Mock mkdir (sandbox not available)' });
  }

  try {
    const sandboxId = project.sandbox_id || projectId.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox = getSandbox(c.env.Sandbox as any, sandboxId);

    const result = await sandbox.exec(`mkdir -p "${body.path}"`);

    if (result.exitCode !== 0) {
      return c.json({ error: 'Failed to create directory', message: result.stderr }, 500);
    }

    return c.json({ success: true, path: body.path });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Sandbox error', message: errorMessage }, 500);
  }
});

// Delete file or directory
files.delete('/projects/:projectId/delete', async (c) => {
  const projectId = c.req.param('projectId');
  const path = c.req.query('path');
  const user = getCurrentUser(c);

  if (!path) {
    return c.json({ error: 'Bad Request', message: 'Path is required' }, 400);
  }

  // Verify project ownership
  const project = await projectQueries.findById(c.env.DB, projectId);
  if (!project || project.user_id !== user.id) {
    return c.json({ error: 'Forbidden', message: 'Not your project' }, 403);
  }

  // Prevent deleting root directories
  if (path === '/' || path === '/workspace' || path === '/home') {
    return c.json({ error: 'Forbidden', message: 'Cannot delete root directories' }, 403);
  }

  if (!c.env.Sandbox) {
    return c.json({ success: true, path, message: 'Mock delete (sandbox not available)' });
  }

  try {
    const sandboxId = project.sandbox_id || projectId.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandbox = getSandbox(c.env.Sandbox as any, sandboxId);

    const result = await sandbox.exec(`rm -rf "${path}"`);

    if (result.exitCode !== 0) {
      return c.json({ error: 'Failed to delete', message: result.stderr }, 500);
    }

    return c.json({ success: true, path });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Sandbox error', message: errorMessage }, 500);
  }
});

// Helper: Parse ls -la output
function parseLsOutput(output: string, basePath: string): FileEntry[] {
  const lines = output.split('\n').filter(Boolean);
  const entries: FileEntry[] = [];

  for (const line of lines) {
    // Skip "total" line
    if (line.startsWith('total ')) continue;

    // Parse ls -la format: permissions links owner group size month day time name
    const match = line.match(/^([drwx-]+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w+\s+\d+\s+[\d:]+)\s+(.+)$/);
    if (!match) continue;

    const [, permissions, size, modified, name] = match;

    // Skip . and ..
    if (name === '.' || name === '..') continue;

    const isDirectory = permissions.startsWith('d');
    const fullPath = basePath === '/' ? `/${name}` : `${basePath}/${name}`;

    entries.push({
      name,
      type: isDirectory ? 'directory' : 'file',
      size: parseInt(size, 10),
      modified,
      path: fullPath,
    });
  }

  // Sort: directories first, then files
  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return entries;
}

// Mock data when sandbox is not available
function getMockFiles(path: string): FileEntry[] {
  const mockFS: Record<string, FileEntry[]> = {
    '/workspace': [
      { name: 'src', type: 'directory', path: '/workspace/src' },
      { name: 'package.json', type: 'file', size: 256, path: '/workspace/package.json' },
      { name: 'README.md', type: 'file', size: 512, path: '/workspace/README.md' },
      { name: 'tsconfig.json', type: 'file', size: 128, path: '/workspace/tsconfig.json' },
    ],
    '/workspace/src': [
      { name: 'index.ts', type: 'file', size: 1024, path: '/workspace/src/index.ts' },
      { name: 'utils.ts', type: 'file', size: 512, path: '/workspace/src/utils.ts' },
      { name: 'types.ts', type: 'file', size: 256, path: '/workspace/src/types.ts' },
    ],
    '/': [
      { name: 'workspace', type: 'directory', path: '/workspace' },
      { name: 'home', type: 'directory', path: '/home' },
      { name: 'tmp', type: 'directory', path: '/tmp' },
    ],
  };

  return mockFS[path] || [];
}

function getMockFileContent(path: string): string | null {
  const mockContents: Record<string, string> = {
    '/workspace/README.md': '# ccdev Sandbox\n\nWelcome to the ccdev sandbox environment.\n\n## Getting Started\n\n1. Write your code\n2. Run in the terminal\n3. Iterate!\n',
    '/workspace/package.json': '{\n  "name": "sandbox-project",\n  "version": "1.0.0",\n  "description": "A sandbox project",\n  "main": "src/index.ts",\n  "scripts": {\n    "start": "ts-node src/index.ts"\n  }\n}\n',
    '/workspace/tsconfig.json': '{\n  "compilerOptions": {\n    "target": "ES2020",\n    "module": "commonjs",\n    "strict": true,\n    "outDir": "./dist"\n  }\n}\n',
    '/workspace/src/index.ts': 'console.log("Hello from ccdev sandbox!");\n\nimport { greet } from "./utils";\n\nconst name = "World";\nconsole.log(greet(name));\n',
    '/workspace/src/utils.ts': 'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
    '/workspace/src/types.ts': 'export interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nexport type Role = "admin" | "user" | "guest";\n',
  };

  return mockContents[path] ?? null;
}

export default files;
