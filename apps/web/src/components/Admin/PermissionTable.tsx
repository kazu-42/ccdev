import { useState } from 'react';
import type { Permission } from '@/lib/api';
import { useAdminStore } from '@/stores/adminStore';

export function PermissionTable() {
  const {
    permissions,
    permissionsLoading,
    users,
    deletePermission,
    createPermission,
  } = useAdminStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPermission, setNewPermission] = useState<{
    user_id: string;
    resource_type: Permission['resource_type'];
    resource_id: string;
    action: Permission['action'];
  }>({
    user_id: '',
    resource_type: 'project',
    resource_id: '',
    action: 'read',
  });

  const handleDelete = async (permissionId: string) => {
    try {
      await deletePermission(permissionId);
      setConfirmDelete(null);
    } catch {
      // Error handled in store
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPermission({
        user_id: newPermission.user_id,
        resource_type: newPermission.resource_type,
        resource_id: newPermission.resource_id || undefined,
        action: newPermission.action,
      });
      setShowAddForm(false);
      setNewPermission({
        user_id: '',
        resource_type: 'project',
        resource_id: '',
        action: 'read',
      });
    } catch {
      // Error handled in store
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Add Permission Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-dark-bg rounded-lg border border-dark-border"
        >
          <h3 className="text-sm font-medium text-white mb-4">
            Add New Permission
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">User</label>
              <select
                value={newPermission.user_id}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    user_id: e.target.value,
                  })
                }
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-sm text-white"
                required
              >
                <option value="">Select user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Resource Type
              </label>
              <select
                value={newPermission.resource_type}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    resource_type: e.target
                      .value as Permission['resource_type'],
                  })
                }
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-sm text-white"
              >
                <option value="project">Project</option>
                <option value="sandbox">Sandbox</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Resource ID (optional)
              </label>
              <input
                type="text"
                value={newPermission.resource_id}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    resource_id: e.target.value,
                  })
                }
                placeholder="Leave empty for all resources"
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-sm text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Action</label>
              <select
                value={newPermission.action}
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    action: e.target.value as Permission['action'],
                  })
                }
                className="w-full bg-dark-surface border border-dark-border rounded px-3 py-2 text-sm text-white"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="delete">Delete</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
            >
              Create Permission
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Add button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
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
          Add Permission
        </button>
      )}

      {/* Permissions table */}
      {permissions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No permissions found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-dark-border">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resource Type
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resource ID
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {permissions.map((permission) => (
                <tr
                  key={permission.id}
                  className="hover:bg-dark-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-400">
                      {permission.user_id.slice(0, 8)}...
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-400 rounded">
                      {permission.resource_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {permission.resource_id || (
                      <span className="text-gray-600">All</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        permission.action === 'admin'
                          ? 'bg-red-500/20 text-red-400'
                          : permission.action === 'delete'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : permission.action === 'write'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {permission.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(permission.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === permission.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(permission.id)}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2 py-1 text-gray-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(permission.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
