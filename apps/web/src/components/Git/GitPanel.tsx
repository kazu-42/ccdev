import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useGitStore } from '@/stores/gitStore';
import { useProjectStore } from '@/stores/projectStore';
import CloneRepositoryModal from './CloneRepositoryModal';
import CommitModal from './CommitModal';

export default function GitPanel() {
  const { currentProject } = useProjectStore();
  const {
    githubStatus,
    repository,
    gitStatus,
    currentBranch,
    branches,
    isLoading,
    error,
    checkGitHubConnection,
    fetchRepository,
    disconnectRepository,
    refreshStatus,
    pull,
    push,
    fetchBranches,
    checkout,
    clearError,
  } = useGitStore();

  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Check GitHub connection on mount
  useEffect(() => {
    checkGitHubConnection();
  }, [checkGitHubConnection]);

  // Fetch repository when project changes
  useEffect(() => {
    if (currentProject) {
      fetchRepository(currentProject.id);
    }
  }, [currentProject, fetchRepository]);

  // Show error as message
  useEffect(() => {
    if (error) {
      setMessage({ type: 'error', text: error });
      clearError();
    }
  }, [error, clearError]);

  // Clear message after timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleConnectGitHub = () => {
    window.location.href = api.getGitHubAuthUrl();
  };

  const handlePull = async () => {
    if (!currentProject) return;
    const result = await pull(currentProject.id);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  const handlePush = async () => {
    if (!currentProject) return;
    const result = await push(currentProject.id);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  const handleCheckout = async (branch: string) => {
    if (!currentProject) return;
    setShowBranchDropdown(false);
    const result = await checkout(currentProject.id, branch);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });
  };

  const handleRefresh = () => {
    if (!currentProject) return;
    refreshStatus(currentProject.id);
    fetchBranches(currentProject.id);
  };

  const handleDisconnectRepo = async () => {
    if (!currentProject) return;
    if (confirm('Disconnect this repository from the project?')) {
      await disconnectRepository(currentProject.id);
      setMessage({ type: 'success', text: 'Repository disconnected' });
    }
  };

  // Show GitHub connection UI if not connected
  if (!githubStatus?.connected) {
    return (
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Git</h3>
        <button
          onClick={handleConnectGitHub}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Connect GitHub
        </button>
      </div>
    );
  }

  // Show clone UI if no repository linked
  if (!repository) {
    return (
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Git</h3>
          <span className="text-xs text-gray-500">
            @{githubStatus.username}
          </span>
        </div>
        <button
          onClick={() => setShowCloneModal(true)}
          disabled={!currentProject}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          Clone Repository
        </button>
        {showCloneModal && currentProject && (
          <CloneRepositoryModal
            projectId={currentProject.id}
            onClose={() => setShowCloneModal(false)}
          />
        )}
      </div>
    );
  }

  // Full Git panel with repository linked
  const hasChanges =
    gitStatus &&
    (gitStatus.staged.length > 0 ||
      gitStatus.modified.length > 0 ||
      gitStatus.untracked.length > 0);

  return (
    <div className="p-4 border-b border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Git</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-white disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-3 p-2 rounded text-xs ${
            message.type === 'success'
              ? 'bg-green-900/50 text-green-300'
              : 'bg-red-900/50 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Repository info */}
      <div className="mb-3 text-xs text-gray-400">
        <span className="font-medium">{repository.repoFullName}</span>
      </div>

      {/* Branch selector */}
      <div className="relative mb-3">
        <button
          onClick={() => {
            if (!showBranchDropdown && currentProject) {
              fetchBranches(currentProject.id);
            }
            setShowBranchDropdown(!showBranchDropdown);
          }}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            {currentBranch || 'No branch'}
          </span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showBranchDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch}
                onClick={() => handleCheckout(branch)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 ${
                  branch === currentBranch ? 'text-blue-400' : 'text-gray-300'
                }`}
              >
                {branch}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      {gitStatus && (
        <div className="mb-3 space-y-1 text-xs">
          {gitStatus.ahead > 0 && (
            <div className="text-blue-400">
              {gitStatus.ahead} commit(s) ahead
            </div>
          )}
          {gitStatus.behind > 0 && (
            <div className="text-yellow-400">
              {gitStatus.behind} commit(s) behind
            </div>
          )}
          {gitStatus.staged.length > 0 && (
            <div className="text-green-400">
              {gitStatus.staged.length} staged
            </div>
          )}
          {gitStatus.modified.length > 0 && (
            <div className="text-orange-400">
              {gitStatus.modified.length} modified
            </div>
          )}
          {gitStatus.untracked.length > 0 && (
            <div className="text-gray-400">
              {gitStatus.untracked.length} untracked
            </div>
          )}
          {!hasChanges && gitStatus.ahead === 0 && gitStatus.behind === 0 && (
            <div className="text-gray-500">Working tree clean</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handlePull}
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm"
        >
          Pull
        </button>
        <button
          onClick={handlePush}
          disabled={isLoading || !gitStatus || gitStatus.ahead === 0}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm"
        >
          Push
        </button>
      </div>

      {/* Commit button */}
      {hasChanges && (
        <button
          onClick={() => setShowCommitModal(true)}
          disabled={isLoading}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm mb-3"
        >
          Commit Changes
        </button>
      )}

      {/* Disconnect */}
      <button
        onClick={handleDisconnectRepo}
        className="w-full text-xs text-gray-500 hover:text-red-400"
      >
        Disconnect repository
      </button>

      {/* Modals */}
      {showCloneModal && currentProject && (
        <CloneRepositoryModal
          projectId={currentProject.id}
          onClose={() => setShowCloneModal(false)}
        />
      )}
      {showCommitModal && currentProject && (
        <CommitModal
          projectId={currentProject.id}
          onClose={() => setShowCommitModal(false)}
          onCommit={(result) => {
            setMessage({
              type: result.success ? 'success' : 'error',
              text: result.message,
            });
          }}
        />
      )}
    </div>
  );
}
