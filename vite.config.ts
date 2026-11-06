import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'git-control-dev-bridge',
      configureServer(server) {
        server.middlewares.use('/api/git', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { repoPath, args, stdin } = payload;
              const cwd = repoPath || process.cwd();

              if (payload.action === 'pick_folder') {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ path: process.cwd() }));
                return;
              }

              if (payload.action === 'read_conflict_file') {
                const fullPath = path.join(cwd, payload.filePath);
                const content = fs.readFileSync(fullPath, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ content }));
                return;
              }

              if (payload.action === 'write_conflict_file') {
                const fullPath = path.join(cwd, payload.filePath);
                fs.writeFileSync(fullPath, payload.content, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
                return;
              }

              const startTime = Date.now();
              if (stdin) {
                const { spawn } = await import('node:child_process');
                const child = spawn('git', args, { cwd, windowsHide: true });
                let stdout = '';
                let stderr = '';
                child.stdout.on('data', d => { stdout += d.toString(); });
                child.stderr.on('data', d => { stderr += d.toString(); });
                child.stdin.write(stdin);
                child.stdin.end();
                child.on('close', code => {
                  const durationMs = Date.now() - startTime;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    stdout,
                    stderr,
                    exitCode: code ?? 0,
                    durationMs,
                    command: `git ${args.join(' ')}`
                  }));
                });
                return;
              }

              const { stdout, stderr } = await execFileAsync('git', args, {
                cwd,
                maxBuffer: 32 * 1024 * 1024,
                windowsHide: true,
              });
              const durationMs = Date.now() - startTime;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                stdout,
                stderr,
                exitCode: 0,
                durationMs,
                command: `git ${args.join(' ')}`
              }));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                stdout: err.stdout || '',
                stderr: err.stderr || err.message || 'Git execution error',
                exitCode: err.code || 1,
                durationMs: 0,
                command: 'git'
              }));
            }
          });
        });
      }
    }
  ],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Monaco is intentionally NOT forced into a manual chunk: letting Rollup keep it
          // inside the lazy DiffAndConflictModal graph prevents it from being preloaded at startup.
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('react-dom') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
