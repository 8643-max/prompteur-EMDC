// File de tâches du cœur natif.
//
// Le front d'EMDC Copilote ne travaille PAS en synchrone : il poste une demande,
// reçoit tout de suite un « job_id », puis sonde l'avancement toutes les deux
// secondes. C'est ce qui évite la coupure à 100 secondes des passerelles.
// Ce module reproduit exactement ce comportement, côté natif.
//
// Contrat attendu par le front (relevé dans copilote/index.html) :
//   POST chat-async   → { job_id }
//   POST async/status → { statut, resultat, etapes[], task_results[], erreur }
//   statut ∈ en_cours | termine | attente_validation | annule | erreur

import crypto from 'crypto';

const JOBS = new Map();
const DUREE_VIE_MS = 30 * 60 * 1000; // 30 min, puis on oublie le job

function nouvelId() {
  return 'job_' + crypto.randomBytes(8).toString('hex');
}

/** Crée un job et rend son identifiant, immédiatement. */
export function creerJob(payload = {}) {
  const id = nouvelId();
  JOBS.set(id, {
    id,
    user_id: payload.user_id || 'guest',
    session_id: payload.session_id || null,
    statut: 'en_cours',
    etapes: [],
    task_results: [],
    resultat: null,
    erreur: null,
    annule: false,
    cree: Date.now(),
  });
  return id;
}

export function lireJob(id) {
  return JOBS.get(id) || null;
}

/** Ajoute une étape visible par l'utilisateur (« Je consulte… »). */
export function ajouterEtape(id, texte) {
  const j = JOBS.get(id);
  if (!j) return;
  j.etapes.push(typeof texte === 'string' ? { titre: texte } : texte);
}

/** Ajoute un résultat intermédiaire d'outil. */
export function ajouterResultatOutil(id, resultat) {
  const j = JOBS.get(id);
  if (!j) return;
  j.task_results.push(resultat);
}

export function terminerJob(id, resultat) {
  const j = JOBS.get(id);
  if (!j || j.annule) return;
  j.statut = 'termine';
  j.resultat = resultat;
}

export function echouerJob(id, erreur) {
  const j = JOBS.get(id);
  if (!j || j.annule) return;
  j.statut = 'erreur';
  j.erreur = String(erreur && erreur.message ? erreur.message : erreur);
}

/** Demande d'arrêt par l'utilisateur : le travail en cours doit cesser. */
export function annulerJob(id) {
  const j = JOBS.get(id);
  if (!j) return false;
  j.annule = true;
  j.statut = 'annule';
  return true;
}

export function estAnnule(id) {
  const j = JOBS.get(id);
  return !j || j.annule;
}

/** Vue renvoyée au front lors du sondage : exactement les champs qu'il lit. */
export function vueStatut(id) {
  const j = JOBS.get(id);
  if (!j) return { statut: 'erreur', erreur: 'Tâche inconnue ou expirée.', etapes: [], task_results: [], resultat: null };
  return {
    statut: j.statut,
    resultat: j.resultat,
    erreur: j.erreur,
    etapes: j.etapes,
    task_results: j.task_results,
  };
}

/** Ménage périodique : on ne garde pas les jobs éternellement en mémoire. */
export function menage() {
  const limite = Date.now() - DUREE_VIE_MS;
  let retires = 0;
  for (const [id, j] of JOBS) {
    if (j.cree < limite) { JOBS.delete(id); retires++; }
  }
  return retires;
}

export function compter() { return JOBS.size; }

setInterval(menage, 5 * 60 * 1000).unref?.();
