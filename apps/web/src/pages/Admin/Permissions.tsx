import { useEffect } from 'react';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { PermissionTable } from '@/components/Admin/PermissionTable';
import { useAdminStore } from '@/stores/adminStore';

export function AdminPermissions() {
  const { fetchPermissions, fetchUsers, error, clearError } = useAdminStore();

  useEffect(() => {
    fetchPermissions();
    fetchUsers(); // Need users for the permission creation form
  }, [fetchPermissions, fetchUsers]);

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Permission Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage fine-grained access control for users and resources
            </p>
          </div>
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

        <div className="bg-dark-surface rounded-xl border border-dark-border p-6">
          <PermissionTable />
        </div>
      </div>
    </AdminLayout>
  );
}
