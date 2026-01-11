import { useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';
import type { User } from '@/lib/api';

export function UserTable() {
  const { users, usersLoading, updateUserRole, deleteUser } = useAdminStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleRoleChange = async (user: User, newRole: 'admin' | 'user') => {
    try {
      await updateUserRole(user.id, newRole);
    } catch {
      // Error handled in store
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      setConfirmDelete(null);
    } catch {
      // Error handled in store
    }
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No users found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b border-dark-border">
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-dark-hover transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-medium">
                    {user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{user.name || 'No name'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user, e.target.value as 'admin' | 'user')}
                  className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${
                    user.role === 'admin'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-primary-500/20 text-primary-400'
                  }`}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {confirmDelete === user.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(user.id)}
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
                    onClick={() => setConfirmDelete(user.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
