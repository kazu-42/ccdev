import { useEffect } from 'react';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { ProjectTable } from '@/components/Admin/ProjectTable';
import { useAdminStore } from '@/stores/adminStore';

export function AdminProjects() {
  const { fetchProjects, error, clearError } = useAdminStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Project Management</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="bg-dark-surface rounded-xl border border-dark-border">
          <ProjectTable />
        </div>
      </div>
    </AdminLayout>
  );
}
