/** @type {import('next').NextConfig} */
const path = require('path');

// Worktree環境ではnode_modulesがメインリポジトリにあるため、
// Turbopackのルートをメインリポジトリに設定する
const mainRepo = path.resolve(__dirname, '..', '..', '..');
const hasLocalNodeModules = require('fs').existsSync(path.join(__dirname, 'node_modules', 'next'));
const turbopackRoot = hasLocalNodeModules ? __dirname : mainRepo;

const nextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
}

module.exports = nextConfig
