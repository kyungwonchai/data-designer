import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, 'frontend', 'dist');
const BACKEND_DIR = path.join(__dirname, 'backend');
const DATA_FILE = path.join(BACKEND_DIR, 'data', 'method_explorer.json');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10170;
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.csv':  'text/csv; charset=utf-8',
};

process.on('uncaughtException', (err) => {
  console.error('[Data Designer Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Data Designer Server] Unhandled Rejection:', reason);
});

let methodExplorerData = [];

async function reloadData() {
  try {
    if (existsSync(DATA_FILE)) {
      methodExplorerData = JSON.parse(await readFile(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load method explorer data:', err);
  }
}

// Execute python via podman container
async function executePython(code) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn('podman', [
        'run',
        '-i',
        '--rm',
        '--net=none',
        '--entrypoint', 'python',
        '-v', `${BACKEND_DIR}:/app:ro,z`,
        '-w', '/app',
        'dscience-exam:3.7.4',
        '/app/runner.py'
      ]);
    } catch (e) {
      return resolve({ success: false, stdout: '', stderr: e.message, images: [], elapsed_ms: 0 });
    }

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      try { proc.kill('SIGKILL'); } catch (e) {}
      resolve({
        success: false,
        stdout: '',
        stderr: '⏱️ 실행 시간 초과 (Timeout 20s) - 연산 루프를 확인하세요.',
        images: [],
        elapsed_ms: 20000
      });
    }, 20000);

    proc.on('close', () => {
      if (killed) return;
      clearTimeout(timer);
      try {
        const jsonRes = JSON.parse(stdout.trim());
        resolve(jsonRes);
      } catch (err) {
        resolve({
          success: stderr ? false : true,
          stdout: stdout,
          stderr: stderr,
          images: [],
          elapsed_ms: 0
        });
      }
    });

    const payload = JSON.stringify({ code: code, work_dir: '/app' });
    proc.stdin?.write(payload);
    proc.stdin?.end();
  });
}

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

    const sendJson = (data, statusCode = 200) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(JSON.stringify(data));
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    // Health check
    if (urlPath === '/api/health' || urlPath === '/data-designer/api/health') {
      return sendJson({ status: 'ok', app: 'Data Designer Pro v1.0' });
    }

    // Method explorer data
    if (urlPath === '/api/method-explorer' || urlPath === '/data-designer/api/method-explorer') {
      if (!methodExplorerData.length) await reloadData();
      return sendJson({ methods: methodExplorerData });
    }

    // Run code
    if ((urlPath === '/api/execute' || urlPath === '/data-designer/api/execute') && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const code = parsed.code || '';
          if (!code.trim()) {
            return sendJson({ success: false, stdout: '', stderr: '코드 내용이 비어있습니다.', images: [], elapsed_ms: 0 });
          }
          const result = await executePython(code);
          return sendJson(result);
        } catch (err) {
          return sendJson({ success: false, stdout: '', stderr: '요청 파싱 실패: ' + err.message, images: [], elapsed_ms: 0 }, 400);
        }
      });
      return;
    }

    // Strip prefix for static file serving
    let relativePath = urlPath;
    if (relativePath.startsWith('/data-designer/')) {
      relativePath = relativePath.slice('/data-designer/'.length);
    } else if (relativePath.startsWith('/data-designer')) {
      relativePath = relativePath.slice('/data-designer'.length);
    }
    if (!relativePath || relativePath === '/') {
      relativePath = 'index.html';
    }

    let filePath = path.join(ROOT, relativePath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error: ' + err.message);
  }
});

await reloadData();
server.listen(PORT, HOST, () => {
  console.log(`[Data Designer] Server running on http://${HOST}:${PORT}`);
});
