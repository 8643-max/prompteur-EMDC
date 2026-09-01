// Serveur HTTP du cœur de l'agent natif EMDC Copilote (EMDC Nexus).
// Expose des endpoints sécurisés que le front (copilote/index.html) appellera
// à la place des webhooks n8n. Authentification laissée à Supabase Auth ; ce
// serveur vérifie en plus une signature HMAC partagée (AGENT_SIGNING_SECRET)
// pour limiter l'accès aux appels légitimes du cœur.

import express from 'express';
import crypto from 'crypto';
import { CFG, missingCritical } from './config.js';
import { traiterTour, construireMessages } from './orchestrateur.js';
import { sbConfigured, sbRead } from './supabase.js';
import { secret, estDefini, apercu, enregistrerCles } from './coffre.js';
import { testerCerveau } from './cerveau.js';
import { executerStudio } from './studio.js';
import { rendreDocument, rendrePresentation } from './documents.js';
import { PAGE_INTERFACE } from './interface.js';

const app = express();
app.use(express.json({ limit: '4mb' }));

// ── CORS : autorise le front (GitHub Pages) à appeler le cœur. ──
app.use((req, res, next) => {
  const origine = req.headers.origin;
  const autorisees = [
    'https://emdcconsulting.com',
    'https://www.emdcconsulting.com',
    'https://copilote.emdcconsulting.com',
    'https://8643-max.github.io',
  ];
  if (origine && autorisees.includes(origine)) {
    res.setHeader('Access-Control-Allow-Origin', origine);
  } else if (origine) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-agente-signature');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Signature HMAC (requêtes d'écriture du front) ──
function verifierSignature(req, res, next) {
  const sig = String(req.headers['x-agente-signature'] || '');
  const secretSign = CFG.AGENT_SIGNING_SECRET;
  if (!secretSign) return next();
  if (!sig) return res.status(401).json({ erreur: 'Signature manquante.' });
  const [ts, hex] = sig.split(':');
  if (!ts || !hex) return res.status(401).json({ erreur: 'Signature mal formée.' });
  const attendu = crypto.createHmac('sha256', secretSign).update(String(ts)).digest('hex');
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(attendu, 'hex'), Buffer.from(hex, 'hex')); } catch { ok = false; }
  if (!ok) return res.status(401).json({ erreur: 'Signature invalide.' });
  const deriverMin = Math.abs(Date.now() / 1000 - Number(ts));
  if (deriverMin > 300) return res.status(401).json({ erreur: 'Signature expirée.' });
  next();
}

// Console d'essai à la racine
app.get('/', (req, res) => res.type('html').send(PAGE_INTERFACE));

// ── Page de configuration du coffre (accès admin) ──
const PAGE_COFFRE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coffre EMDC Nexus</title>
<style>
:root{--bg:#0A1128;--surface:#0F1A35;--elev:#152040;--border:rgba(212,175,55,.25);--gold:#D4AF37;--gold-l:#F0CF6B;--text:#F0EAD6;--muted:#8FA8CC;--ok:#22C55E;--err:#EF4444}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:20px}
.wrap{max-width:640px;margin:0 auto}
h1{font-size:20px;color:var(--gold);margin-bottom:4px}
.sub{font-size:12px;color:var(--muted);margin-bottom:20px}
.carte{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:16px}
.carte h2{font-size:14px;color:var(--gold-l);margin-bottom:10px}
label{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:12px 0 4px}
input{width:100%;padding:9px 12px;background:var(--elev);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px}
.etat{display:inline-block;font-size:11px;padding:2px 9px;border-radius:10px;border:1px solid var(--border);margin-left:6px}
.etat.ok{color:var(--ok);border-color:var(--ok)}
.etat.nok{color:var(--err);border-color:var(--err)}
.btn{width:100%;padding:11px;background:linear-gradient(135deg,var(--gold),var(--gold-l));color:#0A1128;font-weight:700;border:none;border-radius:9px;cursor:pointer;font-size:14px;margin-top:14px}
.msg{margin-top:12px;font-size:13px;padding:10px;border-radius:8px;display:none}
.msg.ok{display:block;background:rgba(34,197,94,.12);border:1px solid var(--ok);color:var(--ok)}
.msg.err{display:block;background:rgba(239,68,68,.12);border:1px solid var(--err);color:var(--err)}
.astuce{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.5}
</style></head><body><div class="wrap">
<h1>🔐 Coffre — EMDC Nexus</h1>
<div class="sub">Paramètres de connexion : enregistrez ici les clés des services. Elles restent côté serveur, jamais exposées au navigateur.</div>
<div class="carte">
<h2>Accès</h2>
<label>Code d'administration</label>
<input type="password" id="code" placeholder="Votre code du coffre">
</div>
<div class="carte">
<h2>Clés de services</h2>
<label>Replicate (image &amp; édition) <span class="etat" id="etat-REPLICATE_API_KEY">…</span></label>
<input id="REPLICATE_API_KEY" placeholder="r8_..." autocomplete="off">
<label>ElevenLabs (voix) <span class="etat" id="etat-ELEVENLABS_API_KEY">…</span></label>
<input id="ELEVENLABS_API_KEY" placeholder="sk_..." autocomplete="off">
<label>DeepSeek (cerveau) <span class="etat" id="etat-DEEPSEEK_API_KEY">…</span></label>
<input id="DEEPSEEK_API_KEY" placeholder="sk-... (optionnel)" autocomplete="off">
<div class="astuce">Laissez un champ vide pour ne pas toucher à la clé. Les clés déjà présentes s'affichent masquées (••••).</div>
</div>
<button class="btn" id="btn" onclick="sauver()">Enregistrer les clés</button>
<div class="msg" id="msg"></div>
</div>
<script>
const champ = id => document.getElementById(id);
async function etatCles(){
  try{
    const r = await fetch('/coffre/etat');
    const d = await r.json();
    for (const [nom, val] of Object.entries(d.cles)){
      const e = champ('etat-'+nom);
      if(e){ e.textContent = val ? '✔ ' + val : '— vide'; e.className = 'etat ' + (val ? 'ok' : 'nok'); }
    }
  }catch(err){}
}
async function sauver(){
  const msg = champ('msg'); msg.className='msg'; msg.style.display='none';
  const cles = {};
  for (const nom of ['REPLICATE_API_KEY','ELEVENLABS_API_KEY','DEEPSEEK_API_KEY']){
    const v = champ(nom).value.trim();
    if(v) cles[nom] = v;
  }
  const r = await fetch('/coffre', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ code: champ('code').value.trim(), cles })
  });
  const d = await r.json().catch(()=>({}));
  msg.textContent = d.ok ? '✅ ' + d.message : '❌ ' + (d.erreur || 'Erreur inconnue');
  msg.className = 'msg ' + (d.ok ? 'ok' : 'err');
  if(d.ok){
    champ('REPLICATE_API_KEY').value=''; champ('ELEVENLABS_API_KEY').value=''; champ('DEEPSEEK_API_KEY').value=''; champ('code').value='';
    etatCles();
  }
}
etatCles();
</script></body></html>`;

app.get('/coffre/etat', (req, res) => {
  const cles = {};
  for (const nom of ['REPLICATE_API_KEY', 'ELEVENLABS_API_KEY', 'DEEPSEEK_API_KEY', 'LLM_API_KEY']) {
    cles[nom] = estDefini(nom) ? apercu(nom) : '';
  }
  res.json({ ok: true, cles });
});

app.post('/coffre', (req, res) => {
  const { code = '', cles = {} } = req.body || {};
  const attendu = process.env.NEXUS_ADMIN_CODE || '';
  if (!attendu) return res.status(503).json({ erreur: 'Code d\'administration non configuré sur le serveur.' });
  if (String(code) !== String(attendu)) return res.status(401).json({ erreur: 'Code d\'administration incorrect.' });
  const r = enregistrerCles(cles);
  res.json(r);
});

app.get('/coffre', (req, res) => res.type('html').send(PAGE_COFFRE));

app.get('/sante', (req, res) => {
  res.json({
    ok: true,
    service: 'emdc-agent-natif',
    cerveau: CFG.LLM_FOURNISSEUR,
    supabase: sbConfigured(),
    studio: { replicate: estDefini('REPLICATE_API_KEY'), elevenlabs: estDefini('ELEVENLABS_API_KEY') },
    documents: true,
    coffre: { llmCle: estDefini('LLM_API_KEY'), supabase: estDefini('SUPABASE_DB_URL') },
  });
});

app.get('/diagnostic', async (req, res) => {
  const manquantes = missingCritical();
  const testCerveau = await testerCerveau();
  res.json({
    configComplete: manquantes.length === 0,
    manquantes,
    cerveau: testCerveau,
    supabaseConfiguree: sbConfigured(),
    studio: { replicate: estDefini('REPLICATE_API_KEY'), elevenlabs: estDefini('ELEVENLABS_API_KEY') },
    documents: true,
  });
});

app.post('/conversation', verifierSignature, async (req, res) => {
  try {
    const { sessionId, historique = [], profil = '', question = '' } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ erreur: 'Le champ « question » est requis.' });
    }
    const messages = construireMessages({ historique, profil, nouvelleQuestion: question });
    const reponse = await traiterTour({ messages });
    res.json({ sessionId: sessionId || null, contenu: reponse.contenu, usage: reponse.usage });
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

app.post('/studio', verifierSignature, async (req, res) => {
  try {
    const d = req.body || {};
    if (!d.user_id) return res.status(400).json({ erreur: 'user_id requis.' });
    const resultat = await executerStudio(d);
    res.json(resultat);
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

app.post('/document', verifierSignature, (req, res) => {
  try {
    const spec = req.body || {};
    if (!spec.titre) return res.status(400).json({ erreur: 'Le champ « titre » est requis.' });
    const html = rendreDocument(spec);
    res.type('html').send(html);
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

app.post('/presentation', verifierSignature, (req, res) => {
  try {
    const spec = req.body || {};
    if (!spec.titre) return res.status(400).json({ erreur: 'Le champ « titre » est requis.' });
    const html = rendrePresentation(spec);
    res.type('html').send(html);
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

app.get('/session/:id', verifierSignature, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!/^[a-z0-9_-]+$/i.test(id)) return res.status(400).json({ erreur: 'ID invalide.' });
    const r = await sbRead(`select * from jobs where id = '${id}' limit 1`);
    res.json(r);
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

const manquantes = missingCritical();
if (manquantes.length) {
  console.warn(`⚠ Démarrage malgré variables manquantes : ${manquantes.join(', ')}`);
}

app.listen(CFG.PORT, () => {
  console.log(`[agent-natif] Cœur EMDC Copilote à l'écoute sur :${CFG.PORT}`);
  console.log(`[agent-natif] Cerveau : ${CFG.LLM_FOURNISSEUR} · Supabase : ${sbConfigured() ? 'OK' : 'non configuré'}`);
});
