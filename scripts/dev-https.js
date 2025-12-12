#!/usr/bin/env node
/**
 * Local HTTPS dev starter.
 * Creates a mkcert stub that copies bundled localhost certs, then runs next dev.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(PROJECT_ROOT, 'certs');
const CACHE_ROOT = process.env.XDG_CACHE_HOME || path.join(PROJECT_ROOT, '.cache');
const MKCERT_VERSION = 'v1.4.4';
const PATCH_MODULE = path.join(PROJECT_ROOT, 'scripts', 'mkcert-exec-patch.js');

function ensureCerts() {
  const keyPath = path.join(CERT_DIR, 'localhost-key.pem');
  const certPath = path.join(CERT_DIR, 'localhost.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error('certs/localhost.pem または certs/localhost-key.pem が見つかりません。');
  }
  return { keyPath, certPath };
}

function getMkcertBinaryPath() {
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;
  const ext = platform === 'windows' ? '.exe' : '';
  const fileName = `mkcert-${MKCERT_VERSION}-${platform}-${arch}${ext}`;
  return path.join(CACHE_ROOT, 'mkcert', fileName);
}

function ensureMkcertStub(keyPath, certPath) {
  const binaryPath = getMkcertBinaryPath();
  if (fs.existsSync(binaryPath)) return binaryPath;

  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  const caroot = path.join(path.dirname(binaryPath), 'caroot');
  const script = [
    '#!/usr/bin/env bash',
    'set -e',
    `CAROOT="${caroot}"`,
    `KEY_SRC="${keyPath}"`,
    `CERT_SRC="${certPath}"`,
    'if [[ "$1" == "-CAROOT" ]]; then',
    '  mkdir -p "$CAROOT"',
    '  echo "$CAROOT"',
    '  exit 0',
    'fi',
    'if [[ "$1" == "-install" ]]; then',
    '  shift',
    '  KEY=""',
    '  CERT=""',
    '  while [[ $# -gt 0 ]]; do',
    '    case "$1" in',
    '      -key-file) KEY="$2"; shift 2;;',
    '      -cert-file) CERT="$2"; shift 2;;',
    '      *) shift;;',
    '    esac',
    '  done',
    '  mkdir -p "$(dirname "$KEY")" "$(dirname "$CERT")" "$CAROOT"',
    '  cp "$KEY_SRC" "$KEY"',
    '  cp "$CERT_SRC" "$CERT"',
    '  cp "$CERT_SRC" "$CAROOT/rootCA.pem"',
    '  exit 0',
    'fi',
    'echo "mkcert stub: unsupported args" >&2',
    'exit 1',
    '',
  ].join('\n');

  fs.writeFileSync(binaryPath, script, { mode: 0o755 });
  return binaryPath;
}

function runNextDev() {
  const env = {
    ...process.env,
    XDG_CACHE_HOME: CACHE_ROOT,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''}--require ${PATCH_MODULE}`,
  };
  const next = spawn('next', ['dev', '--experimental-https', '--hostname', 'localhost', '--port', '3000'], {
    stdio: 'inherit',
    env,
  });
  next.on('exit', (code) => process.exit(code ?? 0));
}

try {
  const { keyPath, certPath } = ensureCerts();
  ensureMkcertStub(keyPath, certPath);
  runNextDev();
} catch (error) {
  console.error('HTTPS dev 起動に失敗しました:', error.message);
  process.exit(1);
}
