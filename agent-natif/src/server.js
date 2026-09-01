// Serveur HTTP du cœur de l'agent natif EMDC Copilote.
// Expose des endpoints sécurisés que le front (copilote/index.html) appellera
// à la place des webhooks n8n. Authentification laissée à Supabase Auth ; ce
// serveur vérifie en plus une signature HMAC partagée (AGENT_SIGNING_SECRET)
// pour limiter l'accès aux appels légitimes du cœur.

import express from 'express';
import crypto from 'crypto';
import { CFG, missingCritical } from './config.js';
import { traiterTour, construireMessages } from './orchestrateur.js';
import { sbConfigured, sbRead } from './supabase.js';
import { secret, estDefini } from './coffre.js';
import { testerCerveau } from './cerveau.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// ── Signature HMAC : chaque requête d'écriture porte une signature de la forme
//    « <timestamp>:<hex>` calculée avec le secret partagé. Tolère 5 min de dérive
//    horaire. Le GET /sante et /diagnostic restent libres. ──
function verifierSignature(req, res, next) {
  const sig = String(req.headers['x-agente-signature'] || '');
  const secretSign = CFG.AGENT_SIGNING_SECRET;
  if (!secretSign) return next(); // pas de secret configuré : on accepte (à durcir en prod)
  if (!sig) return res.status(401).json({ erreur: 'Signature manquante.' });
  const [ts, hex] = sig.split(':');
  if (!ts || !hex) return res.status(401).json({ erreur: 'Signature mal formée.' });
  const attendu = crypto.createHmac('sha256', secretSign).update(String(ts)).digest('hex');
  const ok = crypto.timingSafeEqual(Buffer.from(attendu, 'hex'), Buffer.from(hex, 'hex'));
  if (!ok) return res.status(401).json({ erreur: 'Signature invalide.' });
  const deriverMin = Math.abs(Date.now() / 1000 - Number(ts));
  if (deriverMin > 300) return res.status(401).json({ erreur: 'Signature expirée.' });
  next();
}

app.get('/sante', (req, res) => {
  res.json({
    ok: true,
    service: 'emdc-agent-natif',
    cerveau: CFG.LLM_FOURNISSEUR,
    supabase: sbConfigured(),
    coffre: { llmCle: estDefini('LLM_API_KEY'), supabase: estDefini('SUPABASE_DB_URL') },
  });
});

// Diagnostic détaillé pour l'administration (test réel du cerveau).
app.get('/diagnostic', async (req, res) => {
  const manquantes = missingCritical();
  const testCerveau = await testerCerveau();
  res.json({
    configComplete: manquantes.length === 0,
    manquantes,
    cerveau: testCerveau,
    supabaseConfiguree: sbConfigured(),
  });
});

// Endpoint principal : une question de l'utilisateur → réponse du cerveau.
// Le front envoie { sessionId, historique, profil, question }.
app.post('/conversation', verifierSignature, async (req, res) => {
  try {
    const { sessionId, historique = [], profil = '', question = '' } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ erreur: 'Le champ « question » est requis.' });
    }
    if (!sbConfigured()) {
      return res.status(503).json({ erreur: 'Supabase non configuré sur le cœur.' });
    }
    const messages = construireMessages({ historique, profil, nouvelleQuestion: question });
    const reponse = await traiterTour({ messages });
    res.json({ sessionId: sessionId || null, contenu: reponse.contenu, usage: reponse.usage });
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
});

// Exemple de lecture protégée (données d'une session). À compléter selon besoin.
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
