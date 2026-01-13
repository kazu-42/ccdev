import { create } from 'zustand';

// API base URL
const API_BASE = import.meta.env.PROD
  ? 'https://ccdev-api.ghive42.workers.dev'
  : '';

export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  path: string;
  children?: FileEntry[];
  expanded?: boolean;
  loading?: boolean;
}

interface FileState {
  // File tree state
  rootEntries: FileEntry[];
  isLoading: boolean;
  error: string | null;

  // Currently selected/open file
  selectedFile: FileEntry | null;
  openFiles: FileEntry[];
  activeFileContent: string | null;
  isFileLoading: boolean;
  isFileDirty: boolean;

  // Actions
  loadDirectory: (projectId: string, path?: string) => Promise<FileEntry[]>;
  loadRootDirectory: (projectId: string) => Promise<void>;
  toggleDirectory: (projectId: string, entry: FileEntry) => Promise<void>;
  selectFile: (projectId: string, entry: FileEntry) => Promise<void>;
  closeFile: (entry: FileEntry) => void;
  updateFileContent: (content: string) => void;
  saveFile: (projectId: string) => Promise<void>;
  createFile: (
    projectId: string,
    path: string,
    content?: string,
  ) => Promise<void>;
  createDirectory: (projectId: string, path: string) => Promise<void>;
  deleteEntry: (projectId: string, path: string) => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootEntries: [],
  isLoading: false,
  error: null,
  selectedFile: null,
  openFiles: [],
  activeFileContent: null,
  isFileLoading: false,
  isFileDirty: false,

  loadDirectory: async (projectId: string, path = '/workspace') => {
    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/list?path=${encodeURIComponent(path)}`,
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load directory');
      }

      const data = await response.json();
      return data.entries as FileEntry[];
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
      return [];
    }
  },

  loadRootDirectory: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await get().loadDirectory(projectId, '/workspace');

      // Convert flat entries to tree structure
      const treeEntries = entries.map((entry) => ({
        ...entry,
        expanded: false,
        children: entry.type === 'directory' ? undefined : undefined,
      }));

      set({ rootEntries: treeEntries, isLoading: false });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message, isLoading: false });
    }
  },

  toggleDirectory: async (projectId: string, entry: FileEntry) => {
    const { rootEntries } = get();

    // Find and toggle the directory
    const updateEntries = (entries: FileEntry[]): FileEntry[] => {
      return entries.map((e) => {
        if (e.path === entry.path) {
          if (e.expanded) {
            // Collapse
            return { ...e, expanded: false };
          } else {
            // Expand - need to load children
            return { ...e, expanded: true, loading: true };
          }
        }
        if (e.children) {
          return { ...e, children: updateEntries(e.children) };
        }
        return e;
      });
    };

    set({ rootEntries: updateEntries(rootEntries) });

    // If expanding, load children
    if (!entry.expanded && entry.type === 'directory') {
      const children = await get().loadDirectory(projectId, entry.path);

      const updateWithChildren = (entries: FileEntry[]): FileEntry[] => {
        return entries.map((e) => {
          if (e.path === entry.path) {
            return {
              ...e,
              loading: false,
              children: children.map((child) => ({
                ...child,
                expanded: false,
              })),
            };
          }
          if (e.children) {
            return { ...e, children: updateWithChildren(e.children) };
          }
          return e;
        });
      };

      set({ rootEntries: updateWithChildren(get().rootEntries) });
    }
  },

  selectFile: async (projectId: string, entry: FileEntry) => {
    if (entry.type !== 'file') return;

    // Check if file is already open
    const { openFiles } = get();
    const existing = openFiles.find((f) => f.path === entry.path);

    if (existing) {
      set({ selectedFile: existing });
      // Reload content if not already loaded
      if (get().activeFileContent === null) {
        set({ isFileLoading: true });
        try {
          const response = await fetch(
            `${API_BASE}/api/files/projects/${projectId}/read?path=${encodeURIComponent(entry.path)}`,
            { credentials: 'include' },
          );

          if (response.ok) {
            const data = await response.json();
            set({ activeFileContent: data.content, isFileLoading: false });
          }
        } catch {
          set({ isFileLoading: false });
        }
      }
      return;
    }

    // Load file content
    set({ isFileLoading: true, selectedFile: entry });

    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/read?path=${encodeURIComponent(entry.path)}`,
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to read file');
      }

      const data = await response.json();

      set({
        selectedFile: entry,
        openFiles: [...openFiles, entry],
        activeFileContent: data.content,
        isFileLoading: false,
        isFileDirty: false,
      });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message, isFileLoading: false });
    }
  },

  closeFile: (entry: FileEntry) => {
    const { openFiles, selectedFile } = get();
    const newOpenFiles = openFiles.filter((f) => f.path !== entry.path);

    // If closing selected file, select another one
    if (selectedFile?.path === entry.path) {
      const newSelected =
        newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
      set({
        openFiles: newOpenFiles,
        selectedFile: newSelected,
        activeFileContent: null,
        isFileDirty: false,
      });
    } else {
      set({ openFiles: newOpenFiles });
    }
  },

  updateFileContent: (content: string) => {
    set({ activeFileContent: content, isFileDirty: true });
  },

  saveFile: async (projectId: string) => {
    const { selectedFile, activeFileContent } = get();
    if (!selectedFile || activeFileContent === null) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/write`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            path: selectedFile.path,
            content: activeFileContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      set({ isFileDirty: false });
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
    }
  },

  createFile: async (projectId: string, path: string, content = '') => {
    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/write`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ path, content }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create file');
      }

      // Reload root directory to show new file
      await get().loadRootDirectory(projectId);
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
    }
  },

  createDirectory: async (projectId: string, path: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/mkdir`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ path }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create directory');
      }

      // Reload root directory
      await get().loadRootDirectory(projectId);
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
    }
  },

  deleteEntry: async (projectId: string, path: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/files/projects/${projectId}/delete?path=${encodeURIComponent(path)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      // Close file if it was open
      const { openFiles, selectedFile } = get();
      if (selectedFile?.path === path) {
        get().closeFile(selectedFile);
      }

      // Also close any children if it was a directory
      openFiles.forEach((f) => {
        if (f.path.startsWith(`${path}/`)) {
          get().closeFile(f);
        }
      });

      // Reload root directory
      await get().loadRootDirectory(projectId);
    } catch (err) {
      const error = err as Error;
      set({ error: error.message });
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  reset: () => {
    set({
      rootEntries: [],
      isLoading: false,
      error: null,
      selectedFile: null,
      openFiles: [],
      activeFileContent: null,
      isFileLoading: false,
      isFileDirty: false,
    });
  },
}));
