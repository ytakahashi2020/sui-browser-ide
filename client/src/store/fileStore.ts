import { create } from 'zustand';
import axios from 'axios';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
}

interface FileStore {
  files: FileNode[];
  activeFile: string | null;
  openFiles: string[];
  fileContents: Map<string, string>;

  loadFiles: () => Promise<void>;
  loadFolderContents: (folderPath: string) => Promise<void>;
  createFile: (path: string, isDirectory: boolean) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  saveFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  updateFileContent: (path: string, content: string) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  activeFile: null,
  openFiles: [],
  fileContents: new Map(),

  loadFiles: async () => {
    try {
      const response = await axios.get('/api/files/list');
      if (response.data.success) {
        set({ files: response.data.files });
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  },

  loadFolderContents: async (folderPath: string) => {
    try {
      const response = await axios.get('/api/files/list', { params: { path: folderPath } });
      if (response.data.success) {
        const { files } = get();

        // Find and update the target folder in the file tree
        const updateFolderInTree = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => {
            if (node.path === folderPath && node.isDirectory) {
              return { ...node, children: response.data.files };
            } else if (node.children) {
              return { ...node, children: updateFolderInTree(node.children) };
            }
            return node;
          });
        };

        set({ files: updateFolderInTree(files) });
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    }
  },

  createFile: async (path: string, isDirectory: boolean) => {
    try {
      await axios.post('/api/files/create', { path, isDirectory });
      await get().loadFiles();
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  },

  openFile: async (path: string) => {
    const { openFiles, fileContents } = get();
    if (!openFiles.includes(path)) {
      try {
        const response = await axios.get('/api/files/read', { params: { path } });
        if (response.data.success) {
          const newContents = new Map(fileContents);
          newContents.set(path, response.data.content);
          set({
            openFiles: [...openFiles, path],
            activeFile: path,
            fileContents: newContents
          });
        }
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    } else {
      set({ activeFile: path });
    }
  },

  closeFile: (path: string) => {
    const { openFiles, activeFile, fileContents } = get();
    const newOpenFiles = openFiles.filter(f => f !== path);
    const newContents = new Map(fileContents);
    newContents.delete(path);

    set({
      openFiles: newOpenFiles,
      activeFile: activeFile === path ? (newOpenFiles[0] || null) : activeFile,
      fileContents: newContents
    });
  },

  saveFile: async (path: string, content: string) => {
    try {
      await axios.put('/api/files/update', { path, content });
      const { fileContents } = get();
      const newContents = new Map(fileContents);
      newContents.set(path, content);
      set({ fileContents: newContents });
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  },

  deleteFile: async (path: string) => {
    try {
      await axios.delete('/api/files/delete', { params: { path } });
      get().closeFile(path);
      await get().loadFiles();
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  },

  updateFileContent: (path: string, content: string) => {
    const { fileContents } = get();
    const newContents = new Map(fileContents);
    newContents.set(path, content);
    set({ fileContents: newContents });
  }
}));