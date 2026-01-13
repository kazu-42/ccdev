import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginScreen } from '@/components/Auth/LoginScreen';
import { ChatContainer } from '@/components/Chat/ChatContainer';
import { FileViewer } from '@/components/Editor/FileViewer';
import { ActivityBar } from '@/components/Layout/ActivityBar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { TerminalContainer } from '@/components/Terminal/TerminalContainer';
// Admin pages
import { AdminDashboard } from '@/pages/Admin/Dashboard';
import { AdminPermissions } from '@/pages/Admin/Permissions';
import { AdminProjects } from '@/pages/Admin/Projects';
import { AdminUsers } from '@/pages/Admin/Users';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { useFileStore } from '@/stores/fileStore';
import { useProjectStore } from '@/stores/projectStore';

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function MainContent() {
  const { mode, activeActivity, setMode } = useAppStore();
  const { user, logout } = useAuthStore();
  // Use selector to ensure proper Zustand subscription
  const selectedFile = useFileStore((state) => state.selectedFile);

  // Sync mode with activity selection
  const effectiveMode =
    activeActivity === 'chat'
      ? 'chat'
      : activeActivity === 'terminal'
        ? 'terminal'
        : activeActivity === 'files' && selectedFile
          ? 'editor'
          : mode;

  // Update mode when activity changes
  useEffect(() => {
    if (activeActivity === 'chat' && mode !== 'chat') {
      setMode('chat');
    } else if (activeActivity === 'terminal' && mode !== 'terminal') {
      setMode('terminal');
    } else if (
      activeActivity === 'files' &&
      selectedFile &&
      mode !== 'editor'
    ) {
      setMode('editor');
    }
  }, [activeActivity, mode, setMode, selectedFile]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-dark-surface border-b border-dark-border h-9">
        <div className="flex items-center h-full">
          {/* Tabs */}
          <button
            onClick={() => setMode('terminal')}
            className={`flex items-center gap-2 px-4 h-full text-sm border-r border-dark-border transition-colors ${
              effectiveMode === 'terminal'
                ? 'bg-dark-bg text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Terminal
          </button>
          <button
            onClick={() => setMode('chat')}
            className={`flex items-center gap-2 px-4 h-full text-sm border-r border-dark-border transition-colors ${
              effectiveMode === 'chat'
                ? 'bg-dark-bg text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            AI Chat
          </button>
          {selectedFile && (
            <button
              onClick={() => setMode('editor')}
              className={`flex items-center gap-2 px-4 h-full text-sm border-r border-dark-border transition-colors ${
                effectiveMode === 'editor'
                  ? 'bg-dark-bg text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              Editor
            </button>
          )}
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-4">
            <span className="text-xs text-gray-500">{user.email}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                user.role === 'admin'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-primary-500/20 text-primary-400'
              }`}
            >
              {user.role}
            </span>
            {user.role === 'admin' && (
              <a
                href="/admin"
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Admin
              </a>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {effectiveMode === 'chat' && <ChatContainer />}
        {effectiveMode === 'terminal' && <TerminalContainer />}
        {effectiveMode === 'editor' && <FileViewer />}
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { fetchProjects } = useProjectStore();

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="flex h-screen bg-dark-bg">
      {/* Activity Bar (left icons) */}
      <ActivityBar />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <MainContent />
      </main>
    </div>
  );
}

// Protected admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Main app */}
      <Route path="/" element={<AuthenticatedApp />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/projects"
        element={
          <AdminRoute>
            <AdminProjects />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <AdminRoute>
            <AdminPermissions />
          </AdminRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const { user, isLoading, isInitialized } = useAuthStore();
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  // Initialize auth state on mount - only run once
  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCurrentUser]);

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
