import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExecutable = ['javascript', 'js', 'typescript', 'ts', 'python', 'py'].includes(
    language.toLowerCase()
  );

  return (
    <div className="relative group my-2">
      {/* Language badge */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 rounded-t-lg border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <div className="flex gap-2">
          {isExecutable && (
            <button
              className="text-xs text-gray-400 hover:text-white transition-colors"
              onClick={() => {
                // TODO: Implement code execution
                console.log('Execute:', code);
              }}
            >
              Run
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
    </div>
  );
}
