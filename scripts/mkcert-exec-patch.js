/**
 * Monkey patch execSync so Next.js mkcert calls do not require network or mkcert binary.
 * It copies the bundled localhost certs into the requested path and returns a fake CA root.
 */
const { execSync: originalExecSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CERT_DIR = path.join(PROJECT_ROOT, 'certs');
const CAROOT = path.join(PROJECT_ROOT, '.cache', 'mkcert', 'caroot');

function ensureCerts() {
  const keyPath = path.join(CERT_DIR, 'localhost-key.pem');
  const certPath = path.join(CERT_DIR, 'localhost.pem');
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error('certs/localhost.pem または certs/localhost-key.pem が見つかりません。');
  }
  return { keyPath, certPath };
}

function handleInstall(cmd) {
  const keyMatch = cmd.match(/-key-file\s+"?([^"\\s]+)"?/);
  const certMatch = cmd.match(/-cert-file\s+"?([^"\\s]+)"?/);
  if (!keyMatch || !certMatch) return null;
  const targetKey = keyMatch[1];
  const targetCert = certMatch[1];
  const { keyPath, certPath } = ensureCerts();
  fs.mkdirSync(path.dirname(targetKey), { recursive: true });
  fs.mkdirSync(path.dirname(targetCert), { recursive: true });
  fs.mkdirSync(CAROOT, { recursive: true });
  fs.copyFileSync(keyPath, targetKey);
  fs.copyFileSync(certPath, targetCert);
  fs.copyFileSync(certPath, path.join(CAROOT, 'rootCA.pem'));
  return Buffer.from('');
}

function handleCAROOT() {
  fs.mkdirSync(CAROOT, { recursive: true });
  return Buffer.from(`${CAROOT}\n`);
}

require('child_process').execSync = function patchedExecSync(cmd, options = {}) {
  if (typeof cmd === 'string' && cmd.includes('mkcert')) {
    if (cmd.includes('-CAROOT')) {
      return handleCAROOT();
    }
    if (cmd.includes('-install') && cmd.includes('-key-file') && cmd.includes('-cert-file')) {
      const result = handleInstall(cmd);
      if (result !== null) {
        return result;
      }
    }
  }
  return originalExecSync(cmd, options);
};
