import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// CLI tools that can be installed globally
export interface CLITool {
  id: string;
  name: string;
  description: string;
  installCommand: string;
  checkCommand: string;
  category: 'cloud' | 'dev' | 'vcs' | 'db' | 'util';
}

export const AVAILABLE_CLI_TOOLS: CLITool[] = [
  // Version Control & Git
  {
    id: 'gh',
    name: 'GitHub CLI',
    description: 'GitHub command-line tool',
    installCommand: 'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y',
    checkCommand: 'gh --version',
    category: 'vcs',
  },
  // Cloud Providers
  {
    id: 'awscli',
    name: 'AWS CLI',
    description: 'Amazon Web Services command-line interface',
    installCommand: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" && unzip -q /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install',
    checkCommand: 'aws --version',
    category: 'cloud',
  },
  {
    id: 'gcloud',
    name: 'Google Cloud CLI',
    description: 'Google Cloud Platform command-line tool',
    installCommand: 'curl -fsSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir=/opt',
    checkCommand: 'gcloud --version',
    category: 'cloud',
  },
  {
    id: 'az',
    name: 'Azure CLI',
    description: 'Microsoft Azure command-line interface',
    installCommand: 'curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash',
    checkCommand: 'az --version',
    category: 'cloud',
  },
  {
    id: 'wrangler',
    name: 'Wrangler',
    description: 'Cloudflare Workers CLI',
    installCommand: 'npm install -g wrangler',
    checkCommand: 'wrangler --version',
    category: 'cloud',
  },
  {
    id: 'vercel',
    name: 'Vercel CLI',
    description: 'Vercel deployment CLI',
    installCommand: 'npm install -g vercel',
    checkCommand: 'vercel --version',
    category: 'cloud',
  },
  {
    id: 'fly',
    name: 'Fly.io CLI',
    description: 'Fly.io deployment CLI',
    installCommand: 'curl -L https://fly.io/install.sh | sh',
    checkCommand: 'fly version',
    category: 'cloud',
  },
  // Database Tools
  {
    id: 'supabase',
    name: 'Supabase CLI',
    description: 'Supabase local development CLI',
    installCommand: 'npm install -g supabase',
    checkCommand: 'supabase --version',
    category: 'db',
  },
  {
    id: 'planetscale',
    name: 'PlanetScale CLI',
    description: 'PlanetScale database CLI',
    installCommand: 'curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/scripts/install.sh | bash',
    checkCommand: 'pscale version',
    category: 'db',
  },
  {
    id: 'turso',
    name: 'Turso CLI',
    description: 'Turso edge database CLI',
    installCommand: 'curl -sSfL https://get.tur.so/install.sh | bash',
    checkCommand: 'turso --version',
    category: 'db',
  },
  // Development Tools
  {
    id: 'rg',
    name: 'ripgrep',
    description: 'Fast search tool (rg)',
    installCommand: 'sudo apt-get install -y ripgrep',
    checkCommand: 'rg --version',
    category: 'util',
  },
  {
    id: 'fd',
    name: 'fd',
    description: 'Fast file finder',
    installCommand: 'sudo apt-get install -y fd-find',
    checkCommand: 'fdfind --version',
    category: 'util',
  },
  {
    id: 'jq',
    name: 'jq',
    description: 'JSON processor',
    installCommand: 'sudo apt-get install -y jq',
    checkCommand: 'jq --version',
    category: 'util',
  },
  {
    id: 'fzf',
    name: 'fzf',
    description: 'Fuzzy finder',
    installCommand: 'sudo apt-get install -y fzf',
    checkCommand: 'fzf --version',
    category: 'util',
  },
  {
    id: 'bat',
    name: 'bat',
    description: 'A cat clone with syntax highlighting',
    installCommand: 'sudo apt-get install -y bat',
    checkCommand: 'batcat --version',
    category: 'util',
  },
  {
    id: 'docker',
    name: 'Docker CLI',
    description: 'Container management tool',
    installCommand: 'curl -fsSL https://get.docker.com | sh',
    checkCommand: 'docker --version',
    category: 'dev',
  },
  {
    id: 'kubectl',
    name: 'kubectl',
    description: 'Kubernetes CLI',
    installCommand: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl',
    checkCommand: 'kubectl version --client',
    category: 'dev',
  },
  {
    id: 'terraform',
    name: 'Terraform',
    description: 'Infrastructure as Code tool',
    installCommand: 'sudo apt-get update && sudo apt-get install -y gnupg software-properties-common && wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list && sudo apt update && sudo apt-get install terraform',
    checkCommand: 'terraform --version',
    category: 'dev',
  },
];

export type Theme = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

interface SettingsState {
  // Appearance
  theme: Theme;
  fontSize: FontSize;
  terminalFontSize: number;

  // Editor
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;

  // Terminal
  scrollback: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';

  // CLI Tools - tools to install when creating new sandbox
  selectedTools: string[];
  customSetupScript: string;

  // AI Behavior
  yoloMode: boolean; // Auto-approve all tool calls without confirmation

  // Actions
  setYoloMode: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setTerminalFontSize: (size: number) => void;
  setTabSize: (size: number) => void;
  setWordWrap: (enabled: boolean) => void;
  setShowLineNumbers: (show: boolean) => void;
  setScrollback: (lines: number) => void;
  setCursorBlink: (blink: boolean) => void;
  setCursorStyle: (style: 'block' | 'underline' | 'bar') => void;
  toggleTool: (toolId: string) => void;
  setCustomSetupScript: (script: string) => void;
  getSetupScript: () => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Appearance defaults
      theme: 'dark',
      fontSize: 'medium',
      terminalFontSize: 14,

      // Editor defaults
      tabSize: 2,
      wordWrap: true,
      showLineNumbers: true,

      // Terminal defaults
      scrollback: 5000,
      cursorBlink: true,
      cursorStyle: 'block',

      // CLI Tools defaults
      selectedTools: ['gh', 'rg', 'jq'], // Default selection
      customSetupScript: '',

      // AI Behavior defaults
      yoloMode: false,

      // Actions
      setYoloMode: (yoloMode) => set({ yoloMode }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTerminalFontSize: (terminalFontSize) => set({ terminalFontSize }),
      setTabSize: (tabSize) => set({ tabSize }),
      setWordWrap: (wordWrap) => set({ wordWrap }),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setScrollback: (scrollback) => set({ scrollback }),
      setCursorBlink: (cursorBlink) => set({ cursorBlink }),
      setCursorStyle: (cursorStyle) => set({ cursorStyle }),

      toggleTool: (toolId) =>
        set((state) => ({
          selectedTools: state.selectedTools.includes(toolId)
            ? state.selectedTools.filter((id) => id !== toolId)
            : [...state.selectedTools, toolId],
        })),

      setCustomSetupScript: (customSetupScript) => set({ customSetupScript }),

      // Generate setup script from selected tools
      getSetupScript: () => {
        const state = get();
        const tools = AVAILABLE_CLI_TOOLS.filter((tool) =>
          state.selectedTools.includes(tool.id)
        );

        const lines = [
          '#!/bin/bash',
          '# Auto-generated setup script',
          'set -e',
          '',
        ];

        for (const tool of tools) {
          lines.push(`# Install ${tool.name}`);
          lines.push(`echo "Installing ${tool.name}..."`);
          lines.push(tool.installCommand);
          lines.push('');
        }

        if (state.customSetupScript) {
          lines.push('# Custom setup script');
          lines.push(state.customSetupScript);
        }

        return lines.join('\n');
      },
    }),
    {
      name: 'ccdev-settings-storage',
      version: 1,
    }
  )
);
