import { useState } from 'react';
import { useAdminStore } from '@/stores/adminStore';

export function ProjectTable() {
  const { projects, projectsLoading, deleteProject } = useAdminStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setConfirmDelete(null);
    } catch {
      // Error handled in store
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">No projects found</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b border-dark-border">
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Project
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Sandbox ID
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last Accessed
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border">
          {projects.map((project) => (
            <tr
              key={project.id}
              className="hover:bg-dark-hover transition-colors"
            >
              <td className="px-4 py-3">
                <div>
                  <div className="text-sm text-white">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {project.description}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <code className="text-xs text-gray-400 bg-dark-bg px-2 py-1 rounded">
                  {project.sandbox_id}
                </code>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {new Date(project.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {project.last_accessed_at
                  ? new Date(project.last_accessed_at).toLocaleDateString()
                  : 'Never'}
              </td>
              <td className="px-4 py-3">
                {confirmDelete === project.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(project.id)}
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
                    onClick={() => setConfirmDelete(project.id)}
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
