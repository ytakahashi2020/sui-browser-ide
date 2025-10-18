import React, { useState, useEffect } from 'react';
import { FiFolder, FiFile, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { useFileStore } from '../store/fileStore';

export const FileExplorer: React.FC = () => {
  const { files, loadFiles, loadFolderContents, createFile, openFile, deleteFile } = useFileStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newItemName, setNewItemName] = useState('');
  const [showNewItem, setShowNewItem] = useState(false);
  const [isDirectory, setIsDirectory] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const toggleFolder = async (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      // Load folder contents when expanding
      await loadFolderContents(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateItem = async () => {
    if (newItemName.trim()) {
      await createFile(newItemName, isDirectory);
      setNewItemName('');
      setShowNewItem(false);
    }
  };

  const renderFile = (file: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(file.path);

    return (
      <div key={file.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-700 cursor-pointer`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => file.isDirectory ? toggleFolder(file.path) : openFile(file.path)}
        >
          {file.isDirectory ? (
            <FiFolder size={16} className={isExpanded ? "text-blue-400" : ""} />
          ) : (
            <FiFile size={16} />
          )}
          <span className="text-sm flex-1">{file.name}</span>
          <FiTrash2
            size={14}
            className="opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              deleteFile(file.path);
            }}
          />
        </div>
        {file.isDirectory && isExpanded && file.children && (
          <div>
            {file.children.map((child: any) => renderFile(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-800 text-gray-300 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">FILES</h3>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setShowNewItem(true);
              setIsDirectory(false);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="New File"
          >
            <FiFile size={16} />
          </button>
          <button
            onClick={() => {
              setShowNewItem(true);
              setIsDirectory(true);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="New Folder"
          >
            <FiFolder size={16} />
          </button>
          <button
            onClick={loadFiles}
            className="p-1 hover:bg-gray-700 rounded"
            title="Refresh"
          >
            <FiRefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {showNewItem && (
          <div className="mb-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateItem();
                if (e.key === 'Escape') setShowNewItem(false);
              }}
              placeholder={`New ${isDirectory ? 'folder' : 'file'} name...`}
              className="w-full px-2 py-1 bg-gray-700 text-sm rounded"
              autoFocus
            />
          </div>
        )}

        <div>
          {files.map((file) => renderFile(file))}
        </div>
      </div>
    </div>
  );
};