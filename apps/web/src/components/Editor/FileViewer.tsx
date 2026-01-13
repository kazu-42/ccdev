import { useEffect, useRef } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { useProjectStore } from '@/stores/projectStore';

export function FileViewer() {
  const { currentProject } = useProjectStore();
  const {
    selectedFile,
    openFiles,
    activeFileContent,
    isFileLoading,
    isFileDirty,
    selectFile,
    closeFile,
    updateFileContent,
    saveFile,
  } = useFileStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (currentProject && selectedFile && isFileDirty) {
          saveFile(currentProject.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, selectedFile, isFileDirty, saveFile]);

  // Get language for syntax highlighting hint
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      py: 'python',
      sh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
    };
    return langMap[ext || ''] || 'text';
  };

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg">
        <div className="text-center text-gray-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="w-16 h-16 mx-auto mb-4 opacity-30"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-sm">Select a file to view</p>
          <p className="text-xs mt-1 text-gray-600">
            Use the Explorer in the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-hidden">
      {/* File tabs */}
      <div className="flex items-center bg-dark-surface border-b border-dark-border min-h-[36px] overflow-x-auto">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-dark-border cursor-pointer ${
              selectedFile?.path === file.path
                ? 'bg-dark-bg text-white'
                : 'text-gray-400 hover:text-white hover:bg-dark-bg/50'
            }`}
            onClick={() =>
              currentProject && selectFile(currentProject.id, file)
            }
          >
            <span className="truncate max-w-[120px]">
              {selectedFile?.path === file.path && isFileDirty && (
                <span className="text-primary-400 mr-1">●</span>
              )}
              {file.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file);
              }}
              className="p-0.5 hover:bg-dark-border rounded"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-dark-surface/50 border-b border-dark-border">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{selectedFile.path}</span>
          <span className="px-1.5 py-0.5 bg-dark-border rounded text-gray-400">
            {getLanguage(selectedFile.name)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isFileDirty && (
            <span className="text-xs text-primary-400">Unsaved changes</span>
          )}
          <button
            onClick={() => currentProject && saveFile(currentProject.id)}
            disabled={!isFileDirty || isFileLoading}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isFileDirty
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-dark-border text-gray-500 cursor-not-allowed'
            }`}
          >
            Save
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        {isFileLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={activeFileContent || ''}
            onChange={(e) => updateFileContent(e.target.value)}
            className="w-full h-full p-4 bg-transparent text-gray-200 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder="File is empty..."
          />
        )}
      </div>
    </div>
  );
}
