import { useEffect, useState } from 'react';
import type { GitHubRepo } from '@/lib/api';
import { useGitStore } from '@/stores/gitStore';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function CloneRepositoryModal({ projectId, onClose }: Props) {
  const {
    githubRepos,
    isLoadingRepos,
    hasMoreRepos,
    reposPage,
    isLoading,
    fetchGitHubRepos,
    cloneRepository,
  } = useGitStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Fetch repos on mount
  useEffect(() => {
    fetchGitHubRepos(1);
  }, [fetchGitHubRepos]);

  const filteredRepos = searchQuery
    ? githubRepos.filter((repo) =>
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : githubRepos;

  const handleClone = async () => {
    if (!selectedRepo) return;
    setCloneError(null);

    try {
      await cloneRepository(projectId, selectedRepo);
      onClose();
    } catch (error) {
      setCloneError(error instanceof Error ? error.message : 'Clone failed');
    }
  };

  const loadMore = () => {
    fetchGitHubRepos(reposPage + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Clone Repository</h2>
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

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Repository list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingRepos && githubRepos.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery
                ? 'No repositories found'
                : 'No repositories available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`w-full p-3 rounded text-left transition-colors ${
                    selectedRepo?.id === repo.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{repo.fullName}</span>
                    {repo.private && (
                      <span className="px-1.5 py-0.5 bg-gray-600 rounded text-xs">
                        Private
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {repo.description}
                    </p>
                  )}
                </button>
              ))}
              {hasMoreRepos && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingRepos}
                  className="w-full py-2 text-blue-400 hover:text-blue-300 text-sm disabled:opacity-50"
                >
                  {isLoadingRepos ? 'Loading...' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {cloneError && (
          <div className="px-4 pb-2">
            <div className="p-2 bg-red-900/50 text-red-300 rounded text-sm">
              {cloneError}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!selectedRepo || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            {isLoading ? 'Cloning...' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}
