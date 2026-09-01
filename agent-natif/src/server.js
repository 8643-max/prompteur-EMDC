// Serveur HTTP du cœur de l'agent natif EMDC Copilote.
//
// IMPORTANT — ce serveur reproduit le contrat RÉEL du front (relevé dans
// copilote/index.html), pour pouvoir remplacer n8n sans toucher à l'application :
//
//   POST /webhook/saas/chat-async    { action, message, user_id, session_id,
//                                      history, lang, mode, tool }  → { job_id }
//   POST /webhook/saas/async/status  { job_id, user_id[, action:'cancel'] }
//                                    → { statut, resultat, etapes, task_results, erreur }
//
// Les chemins sont identiques à ceux de n8n : basculer l'application revient à
// changer le nom de domaine dans les constantes du front, rien d'autre.
//
// Une console d'essai est servie sur /console pour éprouver le cœur sans
// toucher à l'application de production.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { CFG, missingCritical } from './config.js';
import { traiterTour, construireMessages } from './orchestrateur.js';
import { sbConfigured } from './supabase.js';
import { estDefini } from './coffre.js';
import { testerCerveau, cerveauActuel } from './cerveau.js';
import {
  creerJob, lireJob, ajouterEtape, terminerJob, echouerJob,
  annulerJob, estAnnule, vueStatut, compter,
} from './jobs.js';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const app = express();
app.use(express.json({ limit: '12mb' }));

// L'application est hébergée ailleurs (GitHub Pages) : le navigateur exige CORS.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Agent-Signature');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Console d'essai (interface de test du cœur).
app.use('/console', express.static(path.join(RACINE, 'public')));

/* ────────── Santé et diagnostic ────────── */

app.get('/sante', (req, res) => {
  res.json({
    ok: true,
    service: 'emdc-agent-natif',
    cerveau: CFG.LLM_FOURNISSEUR,
    modele: cerveauActuel().modele,
    supabase: sbConfigured(),
    jobsEnMemoire: compter(),
    coffre: { llmCle: estDefini('LLM_API_KEY'), supabase: estDefini('SUPABASE_DB_URL') },
  });
});

app.get('/diagnostic', async (req, res) => {
  const manquantes = missingCritical();
  const test = await testerCerveau();
  res.json({
    configComplete: manquantes.length === 0,
    manquantes,
    cerveau: { fournisseur: CFG.LLM_FOURNISSEUR, modele: cerveauActuel().modele, ...test },
    supabaseConfiguree: sbConfigured(),
  });
});

/* ────────── Contrat du front : dépôt de tâche ────────── */

/** Normalise l'historique envoyé par le front vers { role, content }. */
function normaliserHistorique(history) {
  if (!Array.isArray(history)) return [];
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? m.text ?? m.message ?? ''),
  })).filter((m) => m.content.trim());
}

/** Traitement en arrière-plan d'une tâche de conversation. */
async function traiterEnFond(jobId, payload) {
  try {
    ajouterEtape(jobId, 'Je prends connaissance de votre demande…');
    if (estAnnule(jobId)) return;

    const messages = construireMessages({
      historique: normaliserHistorique(payload.history),
      profil: payload.profil || '',
      nouvelleQuestion: String(payload.message || ''),
    });

    const consignes = [];
    if (payload.lang && payload.lang !== 'fr') consignes.push(`Réponds en langue : ${payload.lang}.`);
    if (payload.tool) consignes.push(`Outil demandé par l'utilisateur : ${payload.tool}.`);
    if (payload.user) consignes.push(`Nom de l'utilisateur : ${payload.user}.`);

    ajouterEtape(jobId, 'Je réfléchis à la réponse…');
    if (estAnnule(jobId)) return;

    const r = await traiterTour({ messages, systemExtra: consignes.join('\n'), maxTokens: 2000 });
    if (estAnnule(jobId)) return;

    ajouterEtape(jobId, 'Réponse prête.');
    terminerJob(jobId, r.contenu);
  } catch (e) {
    echouerJob(jobId, e);
  }
}

function deposerTache(req, res) {
  try {
    const p = req.body || {};
    if (!p.message || !String(p.message).trim()) {
      return res.status(400).json({ erreur: 'Le champ « message » est requis.' });
    }
    const jobId = creerJob(p);
    // On répond tout de suite : le front n'attend pas la fin du travail.
    res.json({ job_id: jobId });
    setImmediate(() => traiterEnFond(jobId, p));
  } catch (e) {
    res.status(500).json({ erreur: String(e.message || e) });
  }
}

// Les deux moteurs du front pointent vers le même contrat.
app.post('/webhook/saas/chat-async', deposerTache);
app.post('/webhook/saas/chat-queue', deposerTache);

/* ────────── Contrat du front : sondage d'avancement ────────── */

app.post('/webhook/saas/async/status', (req, res) => {
  const { job_id, action } = req.body || {};
  if (!job_id) return res.status(400).json({ erreur: 'job_id requis.' });

  if (action === 'cancel') {
    const ok = annulerJob(job_id);
    return res.json({ statut: 'annule', annule: ok, etapes: [], task_results: [], resultat: null });
  }

  if (!lireJob(job_id)) {
    return res.json({ statut: 'erreur', erreur: 'Tâche inconnue ou expirée.', etapes: [], task_results: [], resultat: null });
  }
  res.json(vueStatut(job_id));
});

/* ────────── Démarrage ────────── */

const manquantes = missingCritical();
if (manquantes.length) {
  console.warn(`⚠ Démarrage malgré des variables manquantes : ${manquantes.join(', ')}`);
}

app.listen(CFG.PORT, () => {
  console.log(`[agent-natif] Cœur EMDC Copilote à l'écoute sur :${CFG.PORT}`);
  console.log(`[agent-natif] Cerveau : ${CFG.LLM_FOURNISSEUR} · Supabase : ${sbConfigured() ? 'OK' : 'non configuré'}`);
  console.log(`[agent-natif] Console d'essai : http://localhost:${CFG.PORT}/console/`);
});
