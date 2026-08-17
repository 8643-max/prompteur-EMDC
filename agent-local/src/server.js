'use strict';
/**
 * EMDC Copilote — Agent Local
 * Petit service qui tourne sur le PC du client et garde ses documents
 * en local, tout en restant piloté par le cloud EMDC via un tunnel sécurisé.
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '..', 'agent.config.json');
const STORAGE_DIR = path.join(__dirname, '..', 'storage');
const CLOUDFLARED_DIR = path.join(__dirname, '..', 'bin');
const PORT = 8743;
const MAX_SIGNATURE_AGE_SECONDS = 300; // anti-rejeu

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('\n[ERREUR] Fichier agent.config.json introuvable.');
    console.error('Placez le fichier de configuration fourni par EMDC à côté de cet agent, puis relancez.\n');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!cfg.user_id || !cfg.secret || !cfg.register_url) {
    console.error('\n[ERREUR] agent.config.json incomplet (user_id, secret, register_url requis).\n');
    process.exit(1);
  }
  return cfg;
}

function safeStoragePath(filename) {
  // Empêche toute traversée de répertoire (../../etc/passwd etc.)
  const cleaned = path.basename(String(filename || ''));
  if (!cleaned || cleaned === '.' || cleaned === '..') throw new Error('Nom de fichier invalide');
  const full = path.resolve(STORAGE_DIR, cleaned);
  if (!full.startsWith(path.resolve(STORAGE_DIR) + path.sep) && full !== path.resolve(STORAGE_DIR)) {
    throw new Error('Chemin refusé');
  }
  return full;
}

function verifySignature(cfg, timestamp, rawBody) {
  if (!timestamp) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false;
  return true; // la comparaison HMAC se fait dans checkSignature (timing-safe)
}

function checkSignature(cfg, timestamp, rawBody, signature) {
  if (!verifySignature(cfg, timestamp, rawBody)) return false;
  const expected = crypto
    .createHmac('sha256', cfg.secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const a = Buffer.from(signature || '', 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 20 * 1024 * 1024) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

async function handleRequest(cfg, req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const rawBody = await readBody(req);
  const ts = req.headers['x-emdc-timestamp'];
  const sig = req.headers['x-emdc-signature'];

  if (url.pathname !== '/health') {
    if (!checkSignature(cfg, ts, rawBody, sig)) {
      console.warn(`[REFUSÉ] Requête non signée ou invalide depuis ${req.socket.remoteAddress}`);
      return sendJson(res, 401, { success: false, error: 'signature invalide' });
    }
  }

  try {
    if (url.pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, { success: true, status: 'ok', user_id: cfg.user_id });
    }

    if (url.pathname === '/files' && req.method === 'POST') {
      const { filename, content } = JSON.parse(rawBody || '{}');
      const dest = safeStoragePath(filename);
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
      fs.writeFileSync(dest, content ?? '', 'utf8');
      console.log(`[OK] Document indexé localement : ${filename}`);
      return sendJson(res, 200, { success: true, filename, size: Buffer.byteLength(content || '') });
    }

    if (url.pathname === '/files' && req.method === 'GET') {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
      const files = fs.readdirSync(STORAGE_DIR).map((f) => {
        const st = fs.statSync(path.join(STORAGE_DIR, f));
        return { filename: f, size: st.size, created_at: st.birthtime };
      });
      return sendJson(res, 200, { success: true, documents: files });
    }

    if (url.pathname.startsWith('/files/') && req.method === 'DELETE') {
      const filename = decodeURIComponent(url.pathname.slice('/files/'.length));
      const dest = safeStoragePath(filename);
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      console.log(`[OK] Document local supprimé : ${filename}`);
      return sendJson(res, 200, { success: true, filename });
    }

    return sendJson(res, 404, { success: false, error: 'route inconnue' });
  } catch (e) {
    console.error('[ERREUR]', e.message);
    return sendJson(res, 400, { success: false, error: e.message });
  }
}

function startTunnel(cfg, onUrl) {
  const cloudflaredPath = path.join(CLOUDFLARED_DIR, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  if (!fs.existsSync(cloudflaredPath)) {
    console.error('[ERREUR] cloudflared introuvable — exécutez install.bat / install.sh une première fois.');
    return;
  }
  console.log('[INFO] Ouverture du tunnel sécurisé (Cloudflare)...');
  const child = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });

  const onData = (buf) => {
    const text = buf.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) onUrl(match[0]);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  child.on('exit', (code) => {
    console.error(`[ATTENTION] Le tunnel s'est arrêté (code ${code}). Redémarrage dans 5s...`);
    setTimeout(() => startTunnel(cfg, onUrl), 5000);
  });

  return child;
}

function registerWithCloud(cfg, tunnelUrl) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyObj = { operation: 'register_agent', user_id: cfg.user_id, local_agent_url: tunnelUrl };
  const rawBody = JSON.stringify(bodyObj);
  const sig = crypto.createHmac('sha256', cfg.secret).update(`${ts}.${rawBody}`).digest('hex');

  const req = http.request(cfg.register_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rawBody),
      'X-EMDC-Timestamp': ts,
      'X-EMDC-Signature': sig,
    },
  }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      if (res.statusCode === 200) console.log('[OK] Agent enregistré auprès du cloud EMDC.');
      else console.error('[ATTENTION] Échec de l\'enregistrement cloud:', res.statusCode, data);
    });
  });
  req.on('error', (e) => console.error('[ATTENTION] Impossible de contacter le cloud EMDC:', e.message));
  req.write(rawBody);
  req.end();
}

function main() {
  console.log('════════════════════════════════════════');
  console.log('  EMDC Copilote — Agent Local');
  console.log('════════════════════════════════════════');
  const cfg = loadConfig();
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const server = http.createServer((req, res) => handleRequest(cfg, req, res));
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[OK] Agent démarré (port local ${PORT}).`);
    console.log(`[OK] Vos documents restent dans : ${STORAGE_DIR}`);
    startTunnel(cfg, (url) => {
      console.log(`[OK] Tunnel actif : ${url}`);
      registerWithCloud(cfg, url);
      // Ré-enregistrement périodique — l'URL du tunnel peut changer si l'agent redémarre
      setInterval(() => registerWithCloud(cfg, url), 10 * 60 * 1000);
    });
  });
}

main();
