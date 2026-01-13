import { useEffect, useState } from 'react';
import { type FileEntry, useFileStore } from '@/stores/fileStore';
import { useProjectStore } from '@/stores/projectStore';

const FileIcon = ({ name }: { name: string }) => {
  const ext = name.split('.').pop()?.toLowerCase();

  const iconColors: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-blue-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    json: 'text-yellow-300',
    md: 'text-gray-300',
    css: 'text-pink-400',
    html: 'text-orange-400',
    py: 'text-green-400',
    sh: 'text-green-300',
    yml: 'text-purple-400',
    yaml: 'text-purple-400',
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`w-4 h-4 ${iconColors[ext || ''] || 'text-gray-400'}`}
    >
      <path
        fill="currentColor"
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"
      />
    </svg>
  );
};

const FolderIcon = ({ expanded }: { expanded: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-yellow-500">
    {expanded ? (
      <path
        fill="currentColor"
        d="M19 20H4a2 2 0 01-2-2V6a2 2 0 012-2h5l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2z"
      />
    ) : (
      <path
        fill="currentColor"
        d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"
      />
    )}
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 4.5l7.5 7.5-7.5 7.5"
    />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-3 h-3 animate-spin text-gray-500" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  projectId: string;
}

function FileTreeNode({ entry, depth, projectId }: FileTreeNodeProps) {
  const { toggleDirectory, selectFile, selectedFile } = useFileStore();
  const isFolder = entry.type === 'directory';
  const isSelected = selectedFile?.path === entry.path;

  const handleClick = async () => {
    if (isFolder) {
      await toggleDirectory(projectId, entry);
    } else {
      await selectFile(projectId, entry);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1 py-1 px-2 text-sm text-gray-300 hover:bg-dark-border/50 transition-colors text-left ${
          isSelected ? 'bg-primary-600/30 text-white' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder && !entry.loading && (
          <ChevronIcon expanded={entry.expanded || false} />
        )}
        {isFolder && entry.loading && <LoadingSpinner />}
        {!isFolder && <span className="w-3" />}
        {isFolder ? (
          <FolderIcon expanded={entry.expanded || false} />
        ) : (
          <FileIcon name={entry.name} />
        )}
        <span className="truncate">{entry.name}</span>
      </button>

      {isFolder && entry.expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { currentProject } = useProjectStore();
  const { rootEntries, isLoading, error, loadRootDirectory, reset } =
    useFileStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file');

  useEffect(() => {
    if (currentProject) {
      loadRootDirectory(currentProject.id);
    } else {
      reset();
    }
  }, [currentProject, loadRootDirectory, reset]);

  const handleCreateNew = async () => {
    if (!currentProject || !newItemName.trim()) return;

    const { createFile, createDirectory } = useFileStore.getState();
    const path = `/workspace/${newItemName.trim()}`;

    if (newItemType === 'file') {
      await createFile(currentProject.id, path);
    } else {
      await createDirectory(currentProject.id, path);
    }

    setIsCreating(false);
    setNewItemName('');
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        <p>Select a project to view files</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-400">
        <p>Error: {error}</p>
        <button
          onClick={() => loadRootDirectory(currentProject.id)}
          className="mt-2 text-xs text-primary-400 hover:text-primary-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-dark-border">
        <button
          onClick={() => loadRootDirectory(currentProject.id)}
          disabled={isLoading}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
        <button
          onClick={() => {
            setIsCreating(true);
            setNewItemType('file');
          }}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          title="New File"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
        <button
          onClick={() => {
            setIsCreating(true);
            setNewItemType('folder');
          }}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          title="New Folder"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10.5v6m3-3h-6m-4.5 7.5h15a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0020.25 7.5h-6l-1.5-1.5H3.75A2.25 2.25 0 001.5 8.25v10.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </button>
      </div>

      {/* New item input */}
      {isCreating && (
        <div className="px-2 py-2 border-b border-dark-border bg-dark-bg/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNew();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewItemName('');
                }
              }}
              placeholder={
                newItemType === 'file' ? 'filename.ts' : 'folder-name'
              }
              className="flex-1 px-2 py-1 text-xs bg-dark-surface border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleCreateNew}
              className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewItemName('');
              }}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto">
        {isLoading && rootEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : rootEntries.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            <p>No files yet</p>
            <p className="text-xs mt-1">Create a new file to get started</p>
          </div>
        ) : (
          <div className="py-2">
            {rootEntries.map((entry) => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                projectId={currentProject.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
