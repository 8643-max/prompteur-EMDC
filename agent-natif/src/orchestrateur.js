// L'orchestrateur — le cœur décisionnel du moteur natif.
// Il reçoit une demande d'un utilisateur (via un endpoint sécurisé), récupère
// le contexte (profil, session, base documentaire), appelle le cerveau, et
// renvoie une réponse. Il gère aussi le péage : le front demande d'abord un
// devis, l'orchestrateur débite les jetons seulement si l'utilisateur valide.
//
// Pour l'étape P0, l'orchestrateur est volontairement simple : une boucle
// « question → cerveau → réponse », sans brancher encore d'outils (ce sera P1+).
// Il est conçu pour accueillir ensuite les outils un par un.

import { parler } from './cerveau.js';

const SYSTEME_PAR_DEFAUT = `Tu es EMDC Copilote, l'assistant IA professionnel d'EMDC Consulting. Tu aides les entrepreneurs et les PME de façon claire, chaleureuse et concrète. Tu réponds en français par défaut, dans la langue de l'utilisateur. Tu n'inventes jamais une information : si tu ne sais pas, tu le dis.`;

/**
 * Traite un tour de conversation simple.
 * @param {{ messages: Array, systemExtra?: string, maxTokens?: number }} entree
 * @returns {Promise<{contenu:string, usage:object}>}
 */
export async function traiterTour({ messages = [], systemExtra = '', maxTokens = 2000 }) {
  const system = SYSTEME_PAR_DEFAUT + (systemExtra ? `\n\n${systemExtra}` : '');
  return await parler({ system, messages, maxTokens });
}

/**
 * Construit les messages envoyés au cerveau à partir de l'historique stocké et
 * du contexte client (profil). On peut y injecter plus tard un « grounding »
 * sur la base documentaire (RAG) sans changer la signature.
 */
export function construireMessages({ historique = [], profil = '', nouvelleQuestion = '' }) {
  const msgs = [];
  if (profil) msgs.push({ role: 'system', content: `Contexte client :\n${profil.slice(0, 4000)}` });
  for (const m of historique) {
    const role = (m.role === 'assistant' || m.role === 'user') ? m.role : 'user';
    const texte = typeof m.content === 'string' ? m.content : '';
    if (texte.trim()) msgs.push({ role, content: texte.slice(0, 4000) });
  }
  if (nouvelleQuestion.trim()) msgs.push({ role: 'user', content: nouvelleQuestion });
  return msgs;
}
