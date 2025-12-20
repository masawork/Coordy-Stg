#!/usr/bin/env node
/**
 * Local HTTPS dev starter.
 * - Clears .next cache on startup
 * - Generates new session version (forces re-login)
 * - Uses custom HTTPS server with pre-generated certificates
 */
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(PROJECT_ROOT, 'certs');
const NEXT_DIR = path.join(PROJECT_ROOT, '.next');
const SESSION_VERSION_FILE = path.join(PROJECT_ROOT, 'public', 'session-version.json');
const HTTPS_PORT = 3000;
const HTTP_PORT = 3001;

/**
 * .next キャッシュディレクトリを削除
 */
function clearNextCache() {
  if (fs.existsSync(NEXT_DIR)) {
    console.log(' ✓ .next キャッシュをクリア中...');
    fs.rmSync(NEXT_DIR, { recursive: true, force: true });
    console.log(' ✓ .next キャッシュをクリアしました');
  }
}

/**
 * 新しいセッションバージョンを生成
 * これにより、全ユーザーが再ログインを要求される
 */
function generateSessionVersion() {
  const version = crypto.randomUUID();
  const data = {
    version,
    generatedAt: new Date().toISOString(),
  };
  
  // public ディレクトリが存在することを確認
  const publicDir = path.join(PROJECT_ROOT, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(SESSION_VERSION_FILE, JSON.stringify(data, null, 2));
  console.log(' ✓ 新しいセッションバージョンを生成しました');
  console.log(`   Version: ${version}`);
  return version;
}

function ensureCerts() {
  const keyPath = path.join(CERT_DIR, 'localhost-key.pem');
  const certPath = path.join(CERT_DIR, 'localhost.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error('certs/localhost.pem または certs/localhost-key.pem が見つかりません。');
  }
  return { keyPath, certPath };
}

function startNextDev() {
  return new Promise((resolve, reject) => {
    const next = spawn('npx', ['next', 'dev', '--hostname', 'localhost', '--port', String(HTTP_PORT)], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let started = false;

    next.stdout.on('data', (data) => {
      const str = data.toString();
      // Filter out Next.js startup messages
      if (str.includes('Next.js') || str.includes('Local:') || str.includes('Network:') || 
          str.includes('Starting') || str.includes('Ready in')) {
        if (!started && str.includes('Ready in')) {
          started = true;
          resolve(next);
        }
        return;
      }
      process.stdout.write(data);
    });

    next.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    next.on('error', reject);
    next.on('exit', (code) => {
      if (!started) reject(new Error(`Next.js exited with code ${code}`));
    });

    setTimeout(() => { if (!started) resolve(next); }, 60000);
  });
}

function createHttpsProxy(keyPath, certPath) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const proxy = https.createServer(options, (req, res) => {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: HTTP_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end(`Proxy error: ${err.message}`);
    });
    req.pipe(proxyReq);
  });

  proxy.on('upgrade', (req, socket, head) => {
    const proxySocket = new require('net').Socket();
    proxySocket.connect(HTTP_PORT, 'localhost', () => {
      proxySocket.write(
        `${req.method} ${req.url} HTTP/1.1\r\n` +
        Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
        '\r\n\r\n'
      );
      if (head.length > 0) proxySocket.write(head);
      socket.pipe(proxySocket);
      proxySocket.pipe(socket);
    });
    proxySocket.on('error', () => socket.destroy());
    socket.on('error', () => proxySocket.destroy());
  });

  return proxy;
}

async function main() {
  console.log('');
  console.log('  ▲ Next.js 14 (HTTPS) - メンテナンスモード');
  console.log('');
  
  // 1. .next キャッシュをクリア
  clearNextCache();
  
  // 2. 新しいセッションバージョンを生成（全ユーザーを強制ログアウト）
  generateSessionVersion();
  
  console.log('');
  console.log('  ⚠ 全ユーザーは再ログインが必要です');
  console.log('');
  
  // 3. 証明書を確認
  const { keyPath, certPath } = ensureCerts();

  console.log(`  - Local:        https://localhost:${HTTPS_PORT}`);
  console.log('');
  console.log(' ✓ Starting...');

  const nextProcess = await startNextDev();

  const proxy = createHttpsProxy(keyPath, certPath);
  proxy.listen(HTTPS_PORT, 'localhost', () => {
    console.log(' ✓ Ready');
  });

  const shutdown = () => {
    proxy.close();
    nextProcess.kill();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('HTTPS dev 起動に失敗しました:', error.message);
  process.exit(1);
});
