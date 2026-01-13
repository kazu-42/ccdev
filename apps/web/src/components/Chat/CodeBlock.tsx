import { useState } from 'react';
import { OutputPanel } from '@/components/Output/OutputPanel';
import { useCodeExecution } from '@/hooks/useCodeExecution';

interface CodeBlockProps {
  code: string;
  language: string;
}

type ExecutableLanguage = 'javascript' | 'typescript' | 'python';

const LANGUAGE_MAP: Record<string, ExecutableLanguage> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const { execute, isExecuting, result, clearResult } = useCodeExecution();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedLang = language.toLowerCase();
  const executableLang = LANGUAGE_MAP[normalizedLang];
  const isExecutable = !!executableLang;

  const handleRun = async () => {
    if (!executableLang) return;
    setShowOutput(true);
    await execute(code, executableLang);
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
    clearResult();
  };

  return (
    <div className="relative group my-2">
      {/* Language badge */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 rounded-t-lg border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <div className="flex gap-2">
          {isExecutable && (
            <button
              className={`text-xs transition-colors ${
                isExecuting
                  ? 'text-primary-400 cursor-wait'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={handleRun}
              disabled={isExecuting}
            >
              {isExecuting ? 'Running...' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>

      {/* Output Panel */}
      {showOutput && (
        <OutputPanel
          result={result}
          isExecuting={isExecuting}
          onClose={handleCloseOutput}
        />
      )}
    </div>
  );
}
