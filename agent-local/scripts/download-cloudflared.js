'use strict';
/**
 * Télécharge le petit programme "cloudflared" (tunnel sécurisé Cloudflare,
 * gratuit, sans compte requis) adapté au système du client.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');

function urlFor(platform, arch) {
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
  if (platform === 'win32') return base + (arch === 'x64' ? 'cloudflared-windows-amd64.exe' : 'cloudflared-windows-386.exe');
  if (platform === 'darwin') return base + 'cloudflared-darwin-amd64.tgz';
  return base + (arch === 'arm64' ? 'cloudflared-linux-arm64' : 'cloudflared-linux-amd64');
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Trop de redirections'));
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const dest = path.join(BIN_DIR, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  if (fs.existsSync(dest)) {
    console.log('[OK] cloudflared déjà présent, rien à faire.');
    return;
  }
  console.log('[INFO] Téléchargement du tunnel sécurisé (cloudflared)...');
  const url = urlFor(process.platform, process.arch);

  if (process.platform === 'darwin') {
    const tgz = path.join(BIN_DIR, 'cloudflared.tgz');
    await download(url, tgz);
    execFileSync('tar', ['-xzf', tgz, '-C', BIN_DIR]);
    fs.unlinkSync(tgz);
  } else {
    await download(url, dest);
  }
  if (process.platform !== 'win32') fs.chmodSync(dest, 0o755);
  console.log('[OK] cloudflared installé.');
}

main().catch((e) => {
  console.error('[ERREUR] Téléchargement impossible :', e.message);
  console.error('Vérifiez votre connexion internet, ou contactez le support EMDC.');
  process.exit(1);
});
