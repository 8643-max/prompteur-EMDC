// OUTIL P1 — Studio visuel & voix d'EMDC Nexus (natif, sans n8n).
// Migré depuis le workflow n8n « OUTIL · Studio visuel & voix » : mêmes modèles,
// mêmes coûts, mais exécuté directement par le cœur natif.
//
// Quatre opérations, avec péage par crédit (RPC Supabase réserver/confirmer/rembourser) :
//   • image   — génération FLUX Schnell (Replicate)         — 1 crédit
//   • edition — détourage/upscale/retouche/rééclairage       — 4 crédits
//   • decor   — changement de décor                          — 4 crédits
//   • voix    — ElevenLabs (multilingual v2)                 — 1 crédit

import { secret } from './coffre.js';

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

// ── Détection de l'opération d'édition depuis le texte libre ──
function detecterEdition(raw) {
  const s = String(raw || 'detourage').toLowerCase();
  if (/upscale|agrand|hd|qualit|resolution|zoom/.test(s)) return 'upscale';
  if (/retouch|portrait|visage|face|restaur|enhance|ameli/.test(s)) return 'retouche';
  if (/eclair|lumi|light|relight|reeclair/.test(s)) return 'reeclairage';
  return 'detourage';
}

// ── Appel Replicate (lancer une prédiction, avec Prefer: wait si possible) ──
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

// ── Suivi d'une prédiction jusqu'au rendu (avec délai max) ──
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

// ── Péage : réserver / confirmer / rembourser via RPC Supabase ──
// NOTE : en natif, on passe par l'API REST Supabase (comme le faisait n8n).
const SUPABASE_REST = secret('SUPABASE_URL')?.replace(/\/+$/, '') + '/rest/v1';
async function rpc(nom, corps) {
  const url = `${SUPABASE_REST}/rpc/${nom}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': secret('SUPABASE_SERVICE_KEY'),
      'Authorization': `Bearer ${secret('SUPABASE_SERVICE_KEY')}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`${nom} Supabase ${r.status} : ${(await r.text()).slice(0, 200)}`);
  return r.json();
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
  const reserve = await rpc('reserver_media', { p_user_id: user_id, p_session_id: session_id, p_kind: kind, p_cost: cout, p_provider });
  const reserveOk = Array.isArray(reserve) ? reserve[0] : reserve;
  if (reserveOk && reserveOk.ok === false) {
    return { ok: false, erreur: reserveOk.message || 'Solde insuffisant.', manque: true };
  }

  try {
    // 2. Exécuter selon le type
    if (kind === 'voix') return await faireVoix({ prompt, voice_id, user_id, session_id, cout });
    if (type === 'edition' || type === 'decor') return await faireEditionDecor({ type, prompt, image_url, background_url, user_id, session_id, cout });
    return await faireImage({ prompt, user_id, session_id, cout });
  } catch (e) {
    // 3. Échec → rembourser
    await rpc('rembourser_media', { p_user_id: user_id, p_session_id: session_id, p_kind: kind, p_cost: cout }).catch(() => {});
    throw e;
  }
}

async function faireImage({ prompt, user_id, session_id, cout }) {
  const d = await lancerReplicate({ input: { prompt } });
  const rendu = await attendreRendu(d.urls?.get, 90000);
  const url = rendu.output?.[0] || rendu.output;
  if (!url) throw new Error('Image générée sans URL.');
  await rpc('confirmer_media', { p_user_id: user_id, p_session_id: session_id, p_kind: 'image', p_cost: cout, p_provider: 'replicate' });
  return { ok: true, type: 'image', op: 'generation', url, cout };
}

async function faireEditionDecor({ type, prompt, image_url, background_url, user_id, session_id, cout }) {
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
  await rpc('confirmer_media', { p_user_id: user_id, p_session_id: session_id, p_kind: 'edition', p_cost: cout, p_provider: 'replicate' });
  return { ok: true, type, op: type === 'decor' ? 'decor' : detecterEdition(prompt || image_url), url, cout };
}

async function faireVoix({ prompt, voice_id, user_id, session_id, cout }) {
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
  await rpc('confirmer_media', { p_user_id: user_id, p_session_id: session_id, p_kind: 'voix', p_cost: cout, p_provider: 'elevenlabs' });
  return { ok: true, type: 'voix', op: 'voix', octets: buf.length, cout };
}
