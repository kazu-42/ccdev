/**
 * Git Service - Handles Git operations via Sandbox
 */
import { SandboxService, type SandboxExecutionOptions } from './sandbox';
import type { Env, ExecutionResult, GitStatus, GitCommit } from '../types';

export interface GitCloneOptions {
  path?: string;
  branch?: string;
  depth?: number;
}

export class GitService {
  private sandboxService: SandboxService;
  private accessToken: string;

  constructor(env: Env, sandboxId: string, accessToken: string) {
    this.sandboxService = new SandboxService(env, sandboxId);
    this.accessToken = accessToken;
  }

  /**
   * Execute a git command
   */
  private async git(
    args: string,
    options: SandboxExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const env = {
      GIT_TERMINAL_PROMPT: '0',
      ...options.env,
    };

    return this.sandboxService.execCommand(`git ${args}`, {
      ...options,
      env,
    });
  }

  /**
   * Configure git credentials for the session
   */
  async configureCredentials(path: string): Promise<void> {
    // Set up credential helper that uses the token
    await this.git(
      `config credential.helper '!f() { echo "password=${this.accessToken}"; }; f'`,
      { cwd: path }
    );

    // Set user identity if not already set
    await this.git('config user.email "ccdev@ghive.io"', { cwd: path });
    await this.git('config user.name "ccdev"', { cwd: path });
  }

  /**
   * Clone a repository
   */
  async clone(
    repoUrl: string,
    options: GitCloneOptions = {}
  ): Promise<ExecutionResult> {
    const path = options.path || '/workspace';

    // Insert token into HTTPS URL for authentication
    const authUrl = repoUrl.replace(
      'https://',
      `https://oauth2:${this.accessToken}@`
    );

    let args = `clone ${authUrl} ${path}`;

    if (options.branch) {
      args += ` --branch ${options.branch}`;
    }

    if (options.depth) {
      args += ` --depth ${options.depth}`;
    }

    const result = await this.sandboxService.execCommand(args, {
      env: { GIT_TERMINAL_PROMPT: '0' },
    });

    // Configure credentials after clone
    if (result.exitCode === 0) {
      await this.configureCredentials(path);
    }

    return result;
  }

  /**
   * Get repository status
   */
  async status(path: string): Promise<GitStatus> {
    const result = await this.git('status --porcelain -b', { cwd: path });

    if (result.exitCode !== 0) {
      throw new Error(`git status failed: ${result.stderr}`);
    }

    return this.parseGitStatus(result.stdout);
  }

  /**
   * Parse git status --porcelain -b output
   */
  private parseGitStatus(output: string): GitStatus {
    const lines = output.split('\n').filter((l) => l.trim());
    let branch = 'unknown';
    let ahead = 0;
    let behind = 0;
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      // Branch line: ## main...origin/main [ahead 1, behind 2]
      if (line.startsWith('## ')) {
        const branchMatch = line.match(/^## ([^.]+)/);
        if (branchMatch) {
          branch = branchMatch[1];
        }

        const aheadMatch = line.match(/ahead (\d+)/);
        if (aheadMatch) {
          ahead = parseInt(aheadMatch[1]);
        }

        const behindMatch = line.match(/behind (\d+)/);
        if (behindMatch) {
          behind = parseInt(behindMatch[1]);
        }
        continue;
      }

      // File status lines
      const status = line.substring(0, 2);
      const file = line.substring(3).trim();

      if (status === '??' || status === '!!') {
        untracked.push(file);
      } else if (status[0] !== ' ' && status[0] !== '?') {
        staged.push(file);
      } else if (status[1] !== ' ' && status[1] !== '?') {
        modified.push(file);
      }
    }

    return { branch, ahead, behind, staged, modified, untracked };
  }

  /**
   * Pull changes from remote
   */
  async pull(path: string): Promise<ExecutionResult> {
    return this.git('pull', { cwd: path });
  }

  /**
   * Push changes to remote
   */
  async push(
    path: string,
    options: { force?: boolean; setUpstream?: string } = {}
  ): Promise<ExecutionResult> {
    let args = 'push';

    if (options.force) {
      args += ' --force';
    }

    if (options.setUpstream) {
      args += ` --set-upstream origin ${options.setUpstream}`;
    }

    return this.git(args, { cwd: path });
  }

  /**
   * Stage files for commit
   */
  async add(path: string, files?: string[]): Promise<ExecutionResult> {
    if (files && files.length > 0) {
      const fileArgs = files.map((f) => `"${f}"`).join(' ');
      return this.git(`add ${fileArgs}`, { cwd: path });
    }
    return this.git('add -A', { cwd: path });
  }

  /**
   * Commit staged changes
   */
  async commit(
    path: string,
    message: string,
    files?: string[]
  ): Promise<ExecutionResult> {
    // Stage files if specified
    await this.add(path, files);

    // Escape message for shell
    const escapedMessage = message.replace(/'/g, "'\\''");
    return this.git(`commit -m '${escapedMessage}'`, { cwd: path });
  }

  /**
   * Get list of branches
   */
  async branches(
    path: string,
    options: { remote?: boolean; all?: boolean } = {}
  ): Promise<string[]> {
    let args = 'branch';
    if (options.all) {
      args += ' -a';
    } else if (options.remote) {
      args += ' -r';
    }

    const result = await this.git(args, { cwd: path });

    if (result.exitCode !== 0) {
      throw new Error(`git branch failed: ${result.stderr}`);
    }

    return result.stdout
      .split('\n')
      .filter((b) => b.trim())
      .map((b) => b.replace('* ', '').trim());
  }

  /**
   * Get current branch name
   */
  async currentBranch(path: string): Promise<string> {
    const result = await this.git('rev-parse --abbrev-ref HEAD', { cwd: path });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get current branch: ${result.stderr}`);
    }

    return result.stdout.trim();
  }

  /**
   * Checkout branch (switch or create)
   */
  async checkout(
    path: string,
    branch: string,
    options: { create?: boolean } = {}
  ): Promise<ExecutionResult> {
    const flag = options.create ? '-b' : '';
    return this.git(`checkout ${flag} ${branch}`, { cwd: path });
  }

  /**
   * Get commit log
   */
  async log(path: string, limit: number = 20): Promise<GitCommit[]> {
    // Use a delimiter that's unlikely to appear in commit messages
    const delimiter = '|||';
    const format = `%H${delimiter}%an${delimiter}%ae${delimiter}%at${delimiter}%s`;

    const result = await this.git(
      `log --format='${format}' -n ${limit}`,
      { cwd: path }
    );

    if (result.exitCode !== 0) {
      throw new Error(`git log failed: ${result.stderr}`);
    }

    return result.stdout
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const [hash, author, email, timestamp, message] = line.split(delimiter);
        return {
          hash,
          author,
          email,
          timestamp: parseInt(timestamp),
          message,
        };
      });
  }

  /**
   * Get diff (staged or unstaged)
   */
  async diff(
    path: string,
    options: { staged?: boolean; file?: string } = {}
  ): Promise<string> {
    let args = 'diff';

    if (options.staged) {
      args += ' --staged';
    }

    if (options.file) {
      args += ` -- "${options.file}"`;
    }

    const result = await this.git(args, { cwd: path });

    if (result.exitCode !== 0) {
      throw new Error(`git diff failed: ${result.stderr}`);
    }

    return result.stdout;
  }

  /**
   * Fetch from remote
   */
  async fetch(path: string, prune: boolean = false): Promise<ExecutionResult> {
    const args = prune ? 'fetch --prune' : 'fetch';
    return this.git(args, { cwd: path });
  }

  /**
   * Reset changes
   */
  async reset(
    path: string,
    options: { hard?: boolean; files?: string[] } = {}
  ): Promise<ExecutionResult> {
    let args = 'reset';

    if (options.hard) {
      args += ' --hard';
    }

    if (options.files && options.files.length > 0) {
      args += ' -- ' + options.files.map((f) => `"${f}"`).join(' ');
    }

    return this.git(args, { cwd: path });
  }

  /**
   * Stash changes
   */
  async stash(
    path: string,
    options: { message?: string; pop?: boolean; list?: boolean } = {}
  ): Promise<ExecutionResult> {
    let args = 'stash';

    if (options.list) {
      args += ' list';
    } else if (options.pop) {
      args += ' pop';
    } else if (options.message) {
      args += ` push -m '${options.message.replace(/'/g, "'\\''")}'`;
    }

    return this.git(args, { cwd: path });
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepo(path: string): Promise<boolean> {
    const result = await this.git('rev-parse --is-inside-work-tree', {
      cwd: path,
    });
    return result.exitCode === 0 && result.stdout.trim() === 'true';
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(path: string, remote: string = 'origin'): Promise<string> {
    const result = await this.git(`remote get-url ${remote}`, { cwd: path });

    if (result.exitCode !== 0) {
      throw new Error(`Failed to get remote URL: ${result.stderr}`);
    }

    // Remove token from URL if present
    return result.stdout.trim().replace(/oauth2:[^@]+@/, '');
  }
}
