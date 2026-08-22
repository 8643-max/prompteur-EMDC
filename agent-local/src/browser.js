'use strict';
/**
 * EMDC Copilote — Agent Local — Automatisation du navigateur (Worker 7, CDC).
 *
 * Contrairement au mode "headless cloud" (Browserless, deja en place cote n8n
 * pour la navigation autonome sans session), ce module pilote le VRAI Chrome
 * du client, avec un profil qui persiste entre deux appels : le client se
 * connecte une fois (Facebook, LinkedIn, Gmail...) dans la fenetre qui
 * s'ouvre, et les actions suivantes de l'assistant reutilisent cette session
 * deja ouverte. Rien de la session ne quitte le PC autrement que par les
 * actions explicitement demandees (capture d'ecran, texte de la page).
 *
 * Utilise playwright-core (sans navigateur embarque) + le Chrome deja
 * installe du client (`channel: 'chrome'`) : pas de second telechargement
 * de plusieurs centaines de Mo pour un kit qui se veut leger.
 */
const path = require('path');

const PROFIL_DIR = path.join(__dirname, '..', 'storage', '.navigateur');
const MAX_ACTIONS_SANS_ARRET = 200; // simple garde-fou, pas une vraie fuite memoire attendue

let contexte = null;
let page = null;
let compteurActions = 0;

async function demarrer() {
  if (contexte) return { deja_actif: true };
  let playwright;
  try {
    playwright = require('playwright-core');
  } catch (e) {
    throw new Error("playwright-core n'est pas installe. Relancez install.bat / install.sh.");
  }
  contexte = await playwright.chromium.launchPersistentContext(PROFIL_DIR, {
    channel: 'chrome',
    headless: false, // visible : le client doit pouvoir se connecter lui-meme la premiere fois
    viewport: { width: 1280, height: 800 },
  });
  page = contexte.pages()[0] || (await contexte.newPage());
  compteurActions = 0;
  contexte.on('close', () => { contexte = null; page = null; });
  return { deja_actif: false };
}

async function arreter() {
  if (!contexte) return { deja_arrete: true };
  await contexte.close();
  contexte = null;
  page = null;
  return { deja_arrete: false };
}

function verifierActif() {
  if (!contexte || !page) throw new Error("navigateur non demarre -- appelez /browser/start d'abord");
  compteurActions += 1;
  if (compteurActions > MAX_ACTIONS_SANS_ARRET) {
    throw new Error('trop d\'actions dans cette session -- redemarrez le navigateur (/browser/start)');
  }
}

// Une seule action a la fois, sur la page active. La boucle Vision (capture
// -> LLM -> decision -> action) vit cote n8n ; ce module ne fait qu'executer
// l'action que le cloud lui demande et rendre compte du resultat.
async function executerAction({ action, url, selector, texte, x, y, dx, dy, touche, timeout }) {
  verifierActif();
  const delaiMax = Number(timeout) || 15000;

  switch (action) {
    case 'goto':
      if (!url) throw new Error('url requise pour goto');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: delaiMax });
      return { url: page.url(), titre: await page.title() };

    case 'retour':
      await page.goBack({ timeout: delaiMax });
      return { url: page.url() };

    case 'clic':
      if (selector) await page.click(selector, { timeout: delaiMax });
      else if (Number.isFinite(x) && Number.isFinite(y)) await page.mouse.click(x, y);
      else throw new Error('selector ou (x,y) requis pour clic');
      return { ok: true };

    case 'saisie':
      if (!texte) throw new Error('texte requis pour saisie');
      if (selector) await page.fill(selector, texte, { timeout: delaiMax });
      else await page.keyboard.type(texte);
      return { ok: true };

    case 'touche':
      if (!touche) throw new Error('touche requise (ex: Enter, Tab)');
      await page.keyboard.press(touche);
      return { ok: true };

    case 'defilement':
      await page.mouse.wheel(Number(dx) || 0, Number(dy) || 400);
      return { ok: true };

    case 'capture': {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 70 });
      return { image_base64: buffer.toString('base64'), url: page.url() };
    }

    case 'texte_page':
      return { texte: await page.innerText('body').catch(() => '') , url: page.url() };

    case 'etat':
      return { url: page.url(), titre: await page.title().catch(() => '') };

    default:
      throw new Error(`action inconnue : ${action}`);
  }
}

module.exports = { demarrer, arreter, executerAction, estActif: () => !!contexte };
