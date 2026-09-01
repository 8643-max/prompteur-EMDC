// Coffre à clés du cœur de l'agent natif.
// Centralise les secrets côté serveur : les clés ne quittent jamais le VPS et
// ne sont jamais exposées au front. Chargées une fois au démarrage.
//
// Deux sources, dans l'ordre de priorité :
//   1. un fichier connections.json sur le volume (géré depuis l'admin),
//   2. les variables d'environnement (.env du conteneur) — TOUTES les variables,
//      pas seulement celles déclarées dans config.js.
//
// Ainsi, ajouter un nouveau service (Replicate, ElevenLabs, Stripe…) se fait en
// posant une variable d'env : le coffre la rend immédiatement disponible, sans
// toucher au code.

import { existsSync, readFileSync } from 'fs';
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
