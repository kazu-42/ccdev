import { useState } from 'react';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  expanded?: boolean;
}

// Mock file tree for demonstration
const mockFileTree: FileNode[] = [
  {
    name: 'workspace',
    type: 'folder',
    expanded: true,
    children: [
      {
        name: 'src',
        type: 'folder',
        expanded: true,
        children: [
          { name: 'index.ts', type: 'file' },
          { name: 'utils.ts', type: 'file' },
          { name: 'types.ts', type: 'file' },
        ],
      },
      { name: 'package.json', type: 'file' },
      { name: 'README.md', type: 'file' },
      { name: 'tsconfig.json', type: 'file' },
    ],
  },
];

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
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 ${iconColors[ext || ''] || 'text-gray-400'}`}>
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onSelect?: (node: FileNode) => void;
}

function FileTreeNode({ node, depth, onSelect }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(node.expanded ?? false);
  const isFolder = node.type === 'folder';

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    }
    onSelect?.(node);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1 py-1 px-2 text-sm text-gray-300 hover:bg-dark-border/50 transition-colors text-left"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder && <ChevronIcon expanded={expanded} />}
        {!isFolder && <span className="w-3" />}
        {isFolder ? <FolderIcon expanded={expanded} /> : <FileIcon name={node.name} />}
        <span className="truncate">{node.name}</span>
      </button>

      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child, index) => (
            <FileTreeNode
              key={`${child.name}-${index}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const handleSelect = (node: FileNode) => {
    if (node.type === 'file') {
      console.log('Selected file:', node.name);
      // TODO: Open file in editor or show in terminal
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="py-2">
        {mockFileTree.map((node, index) => (
          <FileTreeNode
            key={`${node.name}-${index}`}
            node={node}
            depth={0}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
