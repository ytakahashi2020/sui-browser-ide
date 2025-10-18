import Split from 'react-split';
import { FileExplorer } from './components/FileExplorer';
import { Editor } from './components/Editor';
import { Terminal } from './components/Terminal';
import { WalletConnect } from './components/WalletConnect';
import { FiCode } from 'react-icons/fi';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiCode size={24} className="text-blue-500" />
          <h1 className="text-lg font-semibold">Sui Browser IDE</h1>
        </div>
        <WalletConnect />
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Split
          direction="vertical"
          className="flex-1"
          sizes={[70, 30]}
          minSize={100}
          gutterSize={6}
          gutterAlign="center"
        >
          <Split
            className="flex"
            sizes={[20, 80]}
            minSize={150}
            gutterSize={6}
            gutterAlign="center"
            snapOffset={30}
          >
            <div className="h-full overflow-hidden">
              <FileExplorer />
            </div>

            <div className="h-full overflow-hidden">
              <Editor />
            </div>
          </Split>

          <div className="h-full overflow-hidden border-t border-gray-700">
            <Terminal />
          </div>
        </Split>
      </div>
    </div>
  );
}

export default App;