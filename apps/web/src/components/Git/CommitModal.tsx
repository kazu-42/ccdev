import { useState } from 'react';
import { useGitStore } from '@/stores/gitStore';

interface Props {
  projectId: string;
  onClose: () => void;
  onCommit: (result: { success: boolean; message: string }) => void;
}

export default function CommitModal({ projectId, onClose, onCommit }: Props) {
  const { gitStatus, isLoading, commit } = useGitStore();
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  const allFiles = [
    ...(gitStatus?.modified || []),
    ...(gitStatus?.untracked || []),
    ...(gitStatus?.staged || []),
  ];

  const uniqueFiles = [...new Set(allFiles)];

  const handleToggleFile = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
    setSelectAll(newSelected.size === uniqueFiles.length);
  };

  const handleToggleAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(uniqueFiles));
    }
    setSelectAll(!selectAll);
  };

  const handleCommit = async () => {
    if (!message.trim()) return;

    // If not all files selected, pass the selected files
    const files = selectAll ? undefined : Array.from(selectedFiles);
    const result = await commit(projectId, message.trim(), files);
    onCommit(result);

    if (result.success) {
      onClose();
    }
  };

  const getFileStatus = (file: string) => {
    if (gitStatus?.staged.includes(file)) return 'staged';
    if (gitStatus?.modified.includes(file)) return 'modified';
    if (gitStatus?.untracked.includes(file)) return 'untracked';
    return 'unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'staged':
        return 'text-green-400';
      case 'modified':
        return 'text-orange-400';
      case 'untracked':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Commit Changes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Commit message */}
        <div className="p-4 border-b border-gray-700">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Commit message..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* File selection */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300">
                {uniqueFiles.length} file(s) changed
              </span>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleToggleAll}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                Select all
              </label>
            </div>

            <div className="space-y-1">
              {uniqueFiles.map((file) => {
                const status = getFileStatus(file);
                const isSelected = selectAll || selectedFiles.has(file);

                return (
                  <label
                    key={file}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFile(file)}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${getStatusColor(status)}`}>
                      {file}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {status}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={
              !message.trim() ||
              isLoading ||
              (uniqueFiles.length > 0 && !selectAll && selectedFiles.size === 0)
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            {isLoading ? 'Committing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
}
