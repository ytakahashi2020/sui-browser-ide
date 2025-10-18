import React, { useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useFileStore } from '../store/fileStore';
import { FiX, FiSave } from 'react-icons/fi';

export const Editor: React.FC = () => {
  const {
    activeFile,
    openFiles,
    fileContents,
    closeFile,
    saveFile,
    updateFileContent
  } = useFileStore();

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  }, [activeFile, updateFileContent]);

  const handleSave = useCallback(async () => {
    if (activeFile) {
      const content = fileContents.get(activeFile);
      if (content !== undefined) {
        await saveFile(activeFile, content);
      }
    }
  }, [activeFile, fileContents, saveFile]);

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'move': return 'rust';
      case 'toml': return 'toml';
      case 'json': return 'json';
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  if (!activeFile) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p>No file open</p>
          <p className="text-sm mt-2">Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="flex bg-gray-800 border-b border-gray-700">
        {openFiles.map((file) => (
          <div
            key={file}
            className={`flex items-center gap-2 px-3 py-2 border-r border-gray-700 cursor-pointer ${
              file === activeFile ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => useFileStore.setState({ activeFile: file })}
          >
            <span className="text-sm">{file.split('/').pop()}</span>
            <FiX
              size={14}
              className="hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file);
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex-1">
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          language={getLanguage(activeFile)}
          value={fileContents.get(activeFile) || ''}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          <FiSave size={14} />
          Save
        </button>
      </div>
    </div>
  );
};