// Coffre à clés du cœur de l'agent natif.
// Centralise les secrets côté serveur : les clés ne quittent jamais le VPS et
// ne sont jamais exposées au front. Chargées une fois au démarrage.
//
// Deux sources, dans l'ordre de priorité :
//   1. un fichier connections.json sur le volume (géré depuis la page /coffre),
//   2. les variables d'environnement (.env du conteneur) — TOUTES les variables,
//      pas seulement celles déclarées dans config.js.
//
// Ainsi, ajouter un nouveau service (Replicate, ElevenLabs, Stripe…) se fait en
// posant une variable d'env ou depuis la page de configuration : le coffre le
// rend immédiatement disponible, sans toucher au code.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CFG } from './config.js';

const APP = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // racine du module
const DATA_DIR = process.env.DATA_DIR || path.join(APP, 'data');
const CONN_FILE = path.join(DATA_DIR, 'connections.json');

function lireConnections() {
  try {
    if (existsSync(CONN_FILE)) {
      const brut = readFileSync(CONN_FILE, 'utf8');
      const obj = JSON.parse(brut);
      if (obj && typeof obj === 'object') return obj;
    }
  } catch (e) {
    console.error('[coffre] connections.json illisible :', e.message);
  }
  return {};
}

/**
 * Lit la valeur d'un secret : fichier connections.json d'abord, puis variable
 * d'environnement (process.env), puis config (CFG) en dernier recours.
 */
export function secret(name) {
  const coffre = lireConnections();
  if (coffre[name] != null && String(coffre[name]) !== '') return String(coffre[name]);
  const env = process.env[name];
  if (env != null && String(env) !== '') return String(env);
  return CFG[name] || '';
}

/** Indique si un secret est renseigné (pour l'administration). */
export function estDefini(name) {
  return !!secret(name);
}

/** Aperçu masqué d'un secret : ne montre jamais la valeur. */
export function apercu(name) {
  const v = secret(name);
  return v ? '••••' + v.slice(-4) : '';
}

/**
 * Enregistre une clé dans connections.json (depuis la page de configuration).
 * Préserve les clés déjà présentes. N'écrit RIEN dans le code ni le .env.
 * @param {Record<string,string>} cles  { NOM_CLE: valeur }
 */
export function enregistrerCles(cles) {
  const coffre = lireConnections();
  let modifie = false;
  for (const [nom, valeur] of Object.entries(cles)) {
    const v = String(valeur ?? '').trim();
    if (!/^[A-Z0-9_]{3,64}$/i.test(nom)) continue; // nom de clé valide uniquement
    if (v !== '') { coffre[nom] = v; modifie = true; }
    else if (coffre[nom] != null) { delete coffre[nom]; modifie = true; }
  }
  if (!modifie) return { ok: true, message: 'Rien à modifier.' };
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(CONN_FILE, JSON.stringify(coffre, null, 2), { mode: 0o600 });
    return { ok: true, message: 'Clés enregistrées dans le coffre.', nomCles: Object.keys(cles) };
  } catch (e) {
    return { ok: false, erreur: 'Écriture impossible : ' + (e.message || e) };
  }
}
