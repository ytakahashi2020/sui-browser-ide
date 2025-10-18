import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useCurrentAccount } from '@mysten/dapp-kit';
import 'xterm/css/xterm.css';

export const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#1a1a1a',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1a1a1a',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln('Connected to Sui IDE Terminal');
      term.write('$ ');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output' || data.type === 'error') {
        term.write(data.data);
      } else if (data.type === 'complete') {
        term.write('\r\n$ ');
      }
    };

    ws.onerror = (error) => {
      term.writeln(`\r\nWebSocket error: ${error}`);
    };

    ws.onclose = () => {
      term.writeln('\r\nDisconnected from server');
    };

    let localCommand = '';

    term.onData((data) => {
      if (data === '\r') {
        if (localCommand.trim()) {
          ws.send(JSON.stringify({
            type: 'terminal',
            command: localCommand,
            activeAddress: currentAccount?.address
          }));
          term.write('\r\n');
        } else {
          term.write('\r\n$ ');
        }
        localCommand = '';
      } else if (data === '\u007F') {
        if (localCommand.length > 0) {
          localCommand = localCommand.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        localCommand += data;
        term.write(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2 text-sm text-gray-300 font-medium flex items-center gap-2">
        <span className="text-blue-400">●</span>
        Terminal
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
};