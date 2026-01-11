import { useState } from 'react';
import {
  useSettingsStore,
  AVAILABLE_CLI_TOOLS,
  type Theme,
  type FontSize,
  type CLITool,
} from '@/stores/settingsStore';
import { useClaudeStore } from '@/stores/claudeStore';

type SettingsTab = 'appearance' | 'editor' | 'terminal' | 'tools' | 'claude';

const CATEGORY_LABELS: Record<CLITool['category'], string> = {
  cloud: 'Cloud Providers',
  dev: 'Development',
  vcs: 'Version Control',
  db: 'Database',
  util: 'Utilities',
};

const CATEGORY_ORDER: CLITool['category'][] = ['cloud', 'db', 'dev', 'vcs', 'util'];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('tools');

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'claude',
      label: 'Claude',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
    },
    {
      id: 'tools',
      label: 'CLI Tools',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
        </svg>
      ),
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-dark-border bg-dark-surface/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-primary-500 bg-dark-bg/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'claude' && <ClaudeSettings />}
        {activeTab === 'tools' && <ToolsSettings />}
        {activeTab === 'terminal' && <TerminalSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'editor' && <EditorSettings />}
      </div>
    </div>
  );
}

function ClaudeSettings() {
  const { isConnected, isLoading, apiKey, setApiKey, testConnection, disconnect } = useClaudeStore();
  const { yoloMode, setYoloMode } = useSettingsStore();

  const handleLogin = () => {
    // Open Claude Code subscription page in new tab
    window.open('https://claude.ai/settings/account', '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-1">Claude Code Subscription</h3>
        <p className="text-xs text-gray-500 mb-4">
          Connect your Claude API to enable AI-powered features
        </p>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={testConnection}
                disabled={isLoading || !apiKey}
                className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
              >
                {isLoading ? 'Testing...' : 'Test'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Get your API key from console.anthropic.com
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-medium rounded transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              Manage Subscription
            </button>
            {isConnected && (
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-dark-bg border border-dark-border hover:border-red-500 text-gray-400 hover:text-red-400 text-sm rounded transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-3 bg-dark-bg/50 rounded border border-dark-border">
            <h4 className="text-xs font-medium text-white mb-2">Need an API key?</h4>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Visit console.anthropic.com</li>
              <li>Sign up or log in to your account</li>
              <li>Go to API Keys section</li>
              <li>Create a new key and paste it above</li>
            </ol>
          </div>
        </div>
      </div>

      {/* AI Behavior Section */}
      <div className="mt-8 pt-6 border-t border-dark-border">
        <h3 className="text-sm font-medium text-white mb-1">AI Behavior</h3>
        <p className="text-xs text-gray-500 mb-4">
          Configure how Claude interacts with your environment
        </p>

        <div className="space-y-4">
          {/* YOLO Mode */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm text-white font-medium">YOLO Mode</label>
              <p className="text-xs text-gray-500 mt-0.5">
                Auto-approve all tool executions without confirmation. Use with caution!
              </p>
            </div>
            <button
              onClick={() => setYoloMode(!yoloMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                yoloMode ? 'bg-orange-500' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  yoloMode ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Warning when YOLO mode is enabled */}
          {yoloMode && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-medium text-orange-400">Warning: YOLO Mode Enabled</p>
                <p className="text-xs text-orange-400/70 mt-0.5">
                  Claude will execute code, modify files, and run commands automatically without asking for confirmation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolsSettings() {
  const { selectedTools, toggleTool, customSetupScript, setCustomSetupScript, getSetupScript } =
    useSettingsStore();
  const [showScript, setShowScript] = useState(false);

  const toolsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    tools: AVAILABLE_CLI_TOOLS.filter((tool) => tool.category === category),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-1">Global CLI Tools</h3>
        <p className="text-xs text-gray-500 mb-4">
          Select tools to install when creating a new sandbox environment
        </p>

        <div className="space-y-4">
          {toolsByCategory.map(({ category, label, tools }) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                {label}
              </h4>
              <div className="grid gap-2">
                {tools.map((tool) => (
                  <label
                    key={tool.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-dark-bg/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => toggleTool(tool.id)}
                      className="mt-0.5 rounded border-dark-border bg-dark-bg text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{tool.name}</span>
                        <code className="text-xs px-1 py-0.5 bg-dark-bg rounded text-gray-500">
                          {tool.id}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Setup Script */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Custom Setup Script
        </h4>
        <textarea
          value={customSetupScript}
          onChange={(e) => setCustomSetupScript(e.target.value)}
          placeholder="# Add custom commands to run after tool installation..."
          className="w-full h-24 bg-dark-bg border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-600 font-mono resize-none focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Generated Script Preview */}
      <div>
        <button
          onClick={() => setShowScript(!showScript)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-4 h-4 transition-transform ${showScript ? 'rotate-90' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          View Generated Setup Script
        </button>
        {showScript && (
          <pre className="mt-2 p-3 bg-dark-bg border border-dark-border rounded text-xs text-gray-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {getSetupScript()}
          </pre>
        )}
      </div>

      {/* Selected Count */}
      <div className="text-xs text-gray-500">
        {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
}

function TerminalSettings() {
  const {
    terminalFontSize,
    setTerminalFontSize,
    scrollback,
    setScrollback,
    cursorBlink,
    setCursorBlink,
    cursorStyle,
    setCursorStyle,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Terminal Settings</h3>

        <div className="space-y-4">
          {/* Font Size */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Font Size: {terminalFontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={terminalFontSize}
              onChange={(e) => setTerminalFontSize(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
          </div>

          {/* Scrollback */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              Scrollback Lines: {scrollback.toLocaleString()}
            </label>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={scrollback}
              onChange={(e) => setScrollback(Number(e.target.value))}
              className="w-full accent-primary-500"
            />
          </div>

          {/* Cursor Style */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Cursor Style</label>
            <div className="flex gap-2">
              {(['block', 'underline', 'bar'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setCursorStyle(style)}
                  className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                    cursorStyle === style
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Cursor Blink */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Cursor Blink</label>
            <button
              onClick={() => setCursorBlink(!cursorBlink)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                cursorBlink ? 'bg-primary-600' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  cursorBlink ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme, fontSize, setFontSize } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Appearance</h3>

        <div className="space-y-4">
          {/* Theme */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                    theme === t
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">UI Font Size</label>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                    fontSize === size
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorSettings() {
  const { tabSize, setTabSize, wordWrap, setWordWrap, showLineNumbers, setShowLineNumbers } =
    useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Editor Settings</h3>

        <div className="space-y-4">
          {/* Tab Size */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Tab Size</label>
            <div className="flex gap-2">
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => setTabSize(size)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    tabSize === size
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                  }`}
                >
                  {size} spaces
                </button>
              ))}
            </div>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Word Wrap</label>
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                wordWrap ? 'bg-primary-600' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  wordWrap ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Line Numbers */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">Show Line Numbers</label>
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                showLineNumbers ? 'bg-primary-600' : 'bg-dark-border'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  showLineNumbers ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
