'use strict';
/**
 * Génère le kit "Agent Local" personnalisé pour un client donné.
 * Usage : node scripts/provision-client.js client@exemple.com
 *
 * Ce script :
 *  1. Génère un secret unique pour ce client
 *  2. L'enregistre dans Supabase (table users, colonnes storage_provider/local_agent_secret)
 *  3. Copie le dossier agent-local dans dist/<client>/ avec un agent.config.json déjà rempli
 *  4. Zippe le tout pour être envoyé directement au client
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { execFileSync } = require('child_process');

const SUPA_URL = 'https://tjyvogckvkbqoagxmflg.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const REGISTER_URL = 'https://eldji8643.app.n8n.cloud/webhook/saas/docs';

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function supaRequest(method, pathAndQuery, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPA_URL + pathAndQuery);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(out ? JSON.parse(out) : null);
        else reject(new Error(`Supabase ${res.statusCode}: ${out}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node scripts/provision-client.js <email_ou_user_id_du_client>');
    process.exit(1);
  }
  if (!SUPA_KEY) {
    console.error('[ERREUR] Definissez SUPABASE_SERVICE_KEY (ou SUPABASE_ANON_KEY) dans l\'environnement avant de lancer ce script.');
    process.exit(1);
  }

  const secret = crypto.randomBytes(32).toString('hex');
  console.log(`[INFO] Génération du kit pour : ${userId}`);

  console.log('[INFO] Enregistrement du secret dans Supabase (table users)...');
  await supaRequest('PATCH', `/rest/v1/users?email=eq.${encodeURIComponent(userId)}`, {
    storage_provider: 'LOCAL_DISK',
    local_agent_secret: secret,
  });
  // Si la ligne n'existait pas encore (client jamais connecté), on la crée.
  await supaRequest('POST', `/rest/v1/users`, {
    email: userId,
    storage_provider: 'LOCAL_DISK',
    local_agent_secret: secret,
  }).catch(() => {}); // ignore si la ligne existe déjà (conflit géré par merge-duplicates ci-dessus)

  const clientDir = path.join(DIST, userId.replace(/[^a-z0-9._-]/gi, '_'));
  if (fs.existsSync(clientDir)) fs.rmSync(clientDir, { recursive: true, force: true });
  copyDir(ROOT, clientDir, ['node_modules', 'dist', '.git', 'storage', 'bin']);

  fs.writeFileSync(
    path.join(clientDir, 'agent.config.json'),
    JSON.stringify({ user_id: userId, secret, register_url: REGISTER_URL }, null, 2)
  );
  fs.rmSync(path.join(clientDir, 'agent.config.example.json'), { force: true });
  fs.rmSync(path.join(clientDir, 'scripts', 'provision-client.js'), { force: true });

  const zipPath = path.join(DIST, `agent-emdc-${userId.replace(/[^a-z0-9._-]/gi, '_')}.zip`);
  console.log('[INFO] Compression du kit...');
  try {
    execFileSync('powershell', ['-Command', `Compress-Archive -Path "${clientDir}\\*" -DestinationPath "${zipPath}" -Force`]);
    console.log(`[OK] Kit prêt : ${zipPath}`);
  } catch (e) {
    console.log(`[OK] Dossier prêt (compression manuelle nécessaire) : ${clientDir}`);
  }
  console.log('\nIl ne reste plus qu\'à envoyer ce fichier au client avec les instructions du README.md.');
}

main().catch((e) => {
  console.error('[ERREUR]', e.message);
  process.exit(1);
});
