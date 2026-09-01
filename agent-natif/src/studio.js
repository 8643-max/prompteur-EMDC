// OUTIL P1 — Studio visuel & voix d'EMDC Nexus (natif, sans n8n).
// Migré depuis le workflow n8n « OUTIL · Studio visuel & voix » : mêmes modèles,
// mêmes coûts, mais exécuté directement par le cœur natif.
//
// Quatre opérations, avec péage par crédit (fonctions SQL Supabase) :
//   • image   — génération FLUX Schnell (Replicate)         — 1 crédit
//   • edition — détourage/upscale/retouche/rééclairage       — 4 crédits
//   • decor   — changement de décor                          — 4 crédits
//   • voix    — ElevenLabs (multilingual v2)                 — 1 crédit
//
// Le péage passe par les fonctions SQL reserver_media / confirmer_media /
// rembourser_media, appelées en direct via le pool Postgres (pas besoin de la
// service key REST : le conteneur a accès à la base via SUPABASE_DB_URL).

import { secret } from './coffre.js';
import pg from 'pg';

const REPLICATE = 'https://api.replicate.com';
const CLE_IMAGE = 'REPLICATE_API_KEY';

// ── Modèles Replicate (versions exactes du workflow n8n d'origine) ──
const MODELES_EDITION = {
  detourage:   { version: 'f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7', input: (i) => ({ image: i, resolution: '1024x1024' }) },
  upscale:     { version: 'b3ef194191d13140337468c916c2c5b96dd0cb06dffc032a022a31807f6a5ea8', input: (i) => ({ image: i, scale: 2, face_enhance: true }) },
  retouche:    { version: 'cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2', input: (i) => ({ image: i, upscale: 2, face_upsample: true, background_enhance: true, codeformer_fidelity: 0.7 }) },
  reeclairage: { version: 'd41bcb10d8c159868f4cfbd7c6a2ca01484f7d39e4613419d5952c61562f1ba7', input: (i, p) => ({ subject_image: i, prompt: p || 'professional studio portrait, soft cinematic lighting', light_source: 'Left Light', output_format: 'png' }) },
};
const MODELE_DECOR = '60015df78a8a795470da6494822982140d57b150b9ef14354e79302ff89f69e3';

// ── Péage : les coûts (crédits) par opération ──
export const COUTS = { image: 1, edition: 4, decor: 4, voix: 1 };

let pool = null;
function getPool() {
  if (!pool) {
    const url = secret('SUPABASE_DB_URL');
    if (!url) throw new Error('Connexion Supabase non configurée.');
    pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
    pool.on('error', () => {});
  }
  return pool;
}

// ── Détection de l'opération d'édition depuis le texte libre ──
function detecterEdition(raw) {
  const s = String(raw || 'detourage').toLowerCase();
  if (/upscale|agrand|hd|qualit|resolution|zoom/.test(s)) return 'upscale';
  if (/retouch|portrait|visage|face|restaur|enhance|ameli/.test(s)) return 'retouche';
  if (/eclair|lumi|light|relight|reeclair/.test(s)) return 'reeclairage';
  return 'detourage';
}

// ── Appel Replicate (lancer une prédiction) ──
async function lancerReplicate(body, { attendre = false } = {}) {
  const cle = secret(CLE_IMAGE);
  if (!cle) throw new Error("Clé Replicate non configurée (REPLICATE_API_KEY).");
  const r = await fetch(`${REPLICATE}/v1/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cle}`,
      ...(attendre ? { Prefer: 'wait' } : {}),
    },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Replicate ${r.status} : ${d.detail || d.error || 'erreur inconnue'}`);
  return d;
}

// ── Suivi d'une prédiction jusqu'au rendu ──
async function attendreRendu(url, maxAttenteMs = 120000) {
  const cle = secret(CLE_IMAGE);
  const debut = Date.now();
  for (;;) {
    if (Date.now() - debut > maxAttenteMs) throw new Error('Rendu Replicate trop long (délai dépassé).');
    const r = await fetch(url, { headers: { Authorization: `Bearer ${cle}` } });
    const d = await r.json().catch(() => ({}));
    if (d.status === 'succeeded') return d;
    if (d.status === 'failed') throw new Error('Rendu Replicate échoué.');
    await new Promise((res) => setTimeout(res, 1500));
  }
}

// ── Péage : réserver / confirmer / rembourser (SQL direct via pool) ──
async function reserver(p_user_id, p_session_id, p_kind, p_cost, p_provider) {
  const r = await getPool().query(
    `select reserver_media($1,$2,$3,$4,$5) as r`,
    [p_user_id, p_session_id, p_kind, p_cost, p_provider]
  );
  return r.rows[0]?.r;
}
async function confirmer(p_spend_id) {
  const r = await getPool().query(`select confirmer_media($1) as r`, [p_spend_id]);
  return r.rows[0]?.r;
}
async function rembourser(p_spend_id, p_raison = 'echec') {
  const r = await getPool().query(`select rembourser_media($1,$2) as r`, [p_spend_id, p_raison]);
  return r.rows[0]?.r;
}

/**
 * Point d'entrée du Studio. Reçoit une demande, vérifie le solde, exécute,
 * et rend { type, url, op, cout } — ou jette une erreur claire.
 * @param {{ operation?: string, prompt?: string, image_url?: string, background_url?: string, voice_id?: string, user_id: string, session_id?: string }} demande
 */
export async function executerStudio(demande) {
  const { operation = 'image', prompt = '', image_url = '', background_url = '', voice_id = '', user_id, session_id = null } = demande;
  if (!user_id) throw new Error('user_id requis.');

  const type = String(operation).toLowerCase();
  const kind = type === 'voix' ? 'voix' : (type === 'edition' || type === 'decor' ? 'edition' : 'image');
  const cout = COUTS[kind] ?? 1;
  const p_provider = kind === 'voix' ? 'elevenlabs' : 'replicate';

  // 1. Réserver le péage
  const reserve = await reserver(user_id, session_id, kind, cout, p_provider);
  const reserveOk = (reserve && reserve.ok !== false) || (reserve && reserve.spend_id);
  if (!reserveOk) {
    return { ok: false, erreur: (reserve && reserve.message) || 'Solde insuffisant.', manque: true, detail: reserve };
  }
  const spendId = reserve.spend_id;

  try {
    // 2. Exécuter selon le type
    if (kind === 'voix') return await faireVoix({ prompt, voice_id, spendId });
    if (type === 'edition' || type === 'decor') return await faireEditionDecor({ type, prompt, image_url, background_url, spendId });
    return await faireImage({ prompt, spendId });
  } catch (e) {
    // 3. Échec → rembourser
    await rembourser(spendId).catch(() => {});
    throw e;
  }
}

async function faireImage({ prompt, spendId }) {
  const d = await lancerReplicate({ input: { prompt } });
  const rendu = await attendreRendu(d.urls?.get, 90000);
  const url = rendu.output?.[0] || rendu.output;
  if (!url) throw new Error('Image générée sans URL.');
  await confirmer(spendId);
  return { ok: true, type: 'image', op: 'generation', url, cout: COUTS.image };
}

async function faireEditionDecor({ type, prompt, image_url, background_url, spendId }) {
  let body;
  if (type === 'decor') {
    body = {
      version: MODELE_DECOR,
      input: {
        subject_image: image_url,
        background_image: background_url,
        prompt: prompt || 'cohesive natural lighting, same environment as background',
        light_source: 'Use Background Image',
        output_format: 'png',
      },
    };
  } else {
    const op = detecterEdition(prompt || image_url);
    const m = MODELES_EDITION[op];
    body = { version: m.version, input: m.input(image_url, prompt) };
  }
  const d = await lancerReplicate(body, { attendre: true });
  const rendu = d.status === 'succeeded' ? d : await attendreRendu(d.urls?.get, 120000);
  const url = rendu.output?.[0] || rendu.output;
  if (!url) throw new Error('Édition sans URL de rendu.');
  await confirmer(spendId);
  return { ok: true, type, op: type === 'decor' ? 'decor' : detecterEdition(prompt || image_url), url, cout: COUTS.edition };
}

async function faireVoix({ prompt, voice_id, spendId }) {
  const cle = secret('ELEVENLABS_API_KEY');
  if (!cle) throw new Error("Clé ElevenLabs non configurée (ELEVENLABS_API_KEY).");
  if (!voice_id) throw new Error('voice_id requis pour la voix.');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
    method: 'POST',
    headers: { 'xi-api-key': cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: prompt, model_id: 'eleven_multilingual_v2' }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status} : ${(await r.text()).slice(0, 150)}`);
  const buf = Buffer.from(await r.arrayBuffer());
  // Note : la voix générée est renvoyée en binaire — l'hébergement (Supabase Storage)
  // sera branché à la prochaine itération ; ici on rend un objet avec la taille.
  await confirmer(spendId);
  return { ok: true, type: 'voix', op: 'voix', octets: buf.length, cout: COUTS.voix };
}
