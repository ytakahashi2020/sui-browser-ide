import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const workspaceRoot = path.join(__dirname, '../../workspace');

async function ensureWorkspaceExists() {
  try {
    await fs.access(workspaceRoot);
  } catch {
    await fs.mkdir(workspaceRoot, { recursive: true });
  }
}

app.post('/api/terminal/execute', async (req, res) => {
  const { command, workingDir = '', activeAddress } = req.body;
  const fullPath = path.join(workspaceRoot, workingDir);

  // If activeAddress is provided, set it as SUI_ACTIVE_ADDRESS environment variable
  const env = { ...process.env };
  if (activeAddress) {
    env.SUI_ACTIVE_ADDRESS = activeAddress;
  }

  exec(command, { cwd: fullPath, env }, (error, stdout, stderr) => {
    if (error) {
      res.json({
        success: false,
        output: stderr || error.message,
        error: true
      });
    } else {
      res.json({
        success: true,
        output: stdout + stderr
      });
    }
  });
});

app.post('/api/sui/set-active-address', async (req, res) => {
  const { address } = req.body;
  const fullPath = workspaceRoot;

  // Set the active address using sui client switch command
  exec(`sui client switch --address ${address}`, { cwd: fullPath }, (error, stdout, stderr) => {
    if (error) {
      res.json({
        success: false,
        output: stderr || error.message,
        error: true
      });
    } else {
      res.json({
        success: true,
        output: stdout + stderr
      });
    }
  });
});

app.post('/api/files/create', async (req, res) => {
  const { path: filePath, content = '', isDirectory = false } = req.body;
  const fullPath = path.join(workspaceRoot, filePath);

  try {
    if (isDirectory) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/files/read', async (req, res) => {
  const filePath = req.query.path as string;
  const fullPath = path.join(workspaceRoot, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/files/update', async (req, res) => {
  const { path: filePath, content } = req.body;
  const fullPath = path.join(workspaceRoot, filePath);

  try {
    await fs.writeFile(fullPath, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/files/delete', async (req, res) => {
  const filePath = req.query.path as string;
  const fullPath = path.join(workspaceRoot, filePath);

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Build directory tree recursively
async function buildDirectoryTree(dirPath: string = '', level: number = 0): Promise<any[]> {
  if (level > 2) return []; // Prevent too deep recursion

  const fullPath = path.join(workspaceRoot, dirPath);

  try {
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const files = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(dirPath, item.name);
      const stat = await fs.stat(path.join(workspaceRoot, itemPath));

      const fileNode = {
        name: item.name,
        path: itemPath,
        isDirectory: item.isDirectory(),
        size: stat.size,
        modified: stat.mtime,
        children: [] as any[]
      };

      // If it's a directory, recursively build its children for first level only
      if (item.isDirectory() && level === 0) {
        fileNode.children = await buildDirectoryTree(itemPath, level + 1);
      }

      return fileNode;
    }));
    return files;
  } catch (error) {
    console.error(`Error reading directory ${fullPath}:`, error);
    return [];
  }
}

app.get('/api/files/list', async (req, res) => {
  const dirPath = req.query.path as string || '';

  try {
    if (dirPath === '') {
      // Root directory - return full tree structure
      const files = await buildDirectoryTree();
      res.json({ success: true, files });
    } else {
      // Specific directory - return its contents
      const fullPath = path.join(workspaceRoot, dirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const files = await Promise.all(items.map(async (item) => {
        const itemPath = path.join(dirPath, item.name);
        const stat = await fs.stat(path.join(workspaceRoot, itemPath));
        return {
          name: item.name,
          path: itemPath,
          isDirectory: item.isDirectory(),
          size: stat.size,
          modified: stat.mtime,
          children: []
        };
      }));
      res.json({ success: true, files });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  let currentWorkingDir = workspaceRoot;

  ws.on('message', async (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === 'terminal') {
      const { command, activeAddress } = data;

      // Clean command by removing ANSI escape sequences and control characters
      const cleanCommand = command.replace(/\x1B\[[0-9;]*[mGKHJC]/g, '').replace(/\[D/g, '').replace(/:/g, '').trim();

      // If activeAddress is provided, set it as SUI_ACTIVE_ADDRESS environment variable
      const env = { ...process.env };
      if (activeAddress) {
        env.SUI_ACTIVE_ADDRESS = activeAddress;
      }

      // Handle cd command separately to maintain working directory
      if (cleanCommand.startsWith('cd ')) {
        const targetDir = cleanCommand.substring(3).trim();
        console.log(`CD command: "${command}", targetDir: "${targetDir}", currentWorkingDir: "${currentWorkingDir}"`);

        if (targetDir === '' || targetDir === '~') {
          currentWorkingDir = workspaceRoot;
          console.log(`Changed to home directory: ${currentWorkingDir}`);
        } else if (targetDir === '..') {
          const parentDir = path.dirname(currentWorkingDir);
          if (parentDir.startsWith(workspaceRoot)) {
            currentWorkingDir = parentDir;
            console.log(`Changed to parent directory: ${currentWorkingDir}`);
          }
        } else if (targetDir.startsWith('/')) {
          // Absolute path - ensure it's within workspace
          const absolutePath = path.resolve(targetDir);
          if (absolutePath.startsWith(workspaceRoot)) {
            currentWorkingDir = absolutePath;
            console.log(`Changed to absolute path: ${currentWorkingDir}`);
          }
        } else {
          // Relative path
          const newDir = path.resolve(currentWorkingDir, targetDir);
          console.log(`Attempting to change to relative path: ${newDir}`);
          if (newDir.startsWith(workspaceRoot)) {
            try {
              // Check if directory exists
              try {
                await fs.access(newDir);
                const stat = await fs.stat(newDir);
                if (stat.isDirectory()) {
                  currentWorkingDir = newDir;
                  console.log(`Successfully changed to: ${currentWorkingDir}`);
                } else {
                  console.log(`Path is not a directory: ${newDir}`);
                  ws.send(JSON.stringify({
                    type: 'error',
                    data: `cd: ${targetDir}: Not a directory\r\n`
                  }));
                  ws.send(JSON.stringify({
                    type: 'complete',
                    code: 1
                  }));
                  return;
                }
              } catch (error) {
                console.log(`Directory does not exist: ${newDir}`);
                ws.send(JSON.stringify({
                  type: 'error',
                  data: `cd: ${targetDir}: No such file or directory\r\n`
                }));
                ws.send(JSON.stringify({
                  type: 'complete',
                  code: 1
                }));
                return;
              }
            } catch (error) {
                console.log(`Directory does not exist: ${newDir}`);
                ws.send(JSON.stringify({
                  type: 'error',
                  data: `cd: ${targetDir}: No such file or directory\r\n`
                }));
                ws.send(JSON.stringify({
                  type: 'complete',
                  code: 1
                }));
                return;
              }
          } else {
            console.log(`Path outside workspace: ${newDir} (workspace: ${workspaceRoot})`);
          }
        }

        ws.send(JSON.stringify({
          type: 'complete',
          code: 0
        }));
        return;
      }

      // Handle pwd command
      if (cleanCommand === 'pwd') {
        console.log(`PWD command - currentWorkingDir: ${currentWorkingDir}`);
        ws.send(JSON.stringify({
          type: 'output',
          data: currentWorkingDir + '\r\n'
        }));
        ws.send(JSON.stringify({
          type: 'complete',
          code: 0
        }));
        return;
      }

      // Handle ls command specially to format output
      if (cleanCommand === 'ls' || cleanCommand.startsWith('ls ')) {
        const child = spawn(cleanCommand, [], {
          cwd: currentWorkingDir,
          shell: true,
          env
        });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'error',
            data: data.toString()
          }));
        });

        child.on('close', (code) => {
          if (output) {
            // Format ls output - replace tabs with spaces and clean up formatting
            const cleanedOutput = output
              .replace(/\t+/g, ' ')     // Replace tabs with single space
              .replace(/\s+/g, ' ')     // Replace multiple whitespace with single space
              .replace(/\r\n/g, '\n')   // Normalize line endings
              .trim();

            const lines = cleanedOutput.split('\n').filter(line => line.trim());
            const formattedOutput = lines.join('\r\n') + (lines.length > 0 ? '\r\n' : '');
            ws.send(JSON.stringify({
              type: 'output',
              data: formattedOutput
            }));
          }
          ws.send(JSON.stringify({
            type: 'complete',
            code
          }));
        });
      } else {
        const child = spawn(cleanCommand, [], {
          cwd: currentWorkingDir,
          shell: true,
          env
        });

        child.stdout.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString()
          }));
        });

        child.stderr.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'error',
            data: data.toString()
          }));
        });

        child.on('close', (code) => {
          ws.send(JSON.stringify({
            type: 'complete',
            code
          }));
        });
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

async function startServer() {
  await ensureWorkspaceExists();
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();