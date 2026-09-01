// Le « cerveau » du cœur de l'agent natif — d'où viennent les réponses.
//
// Même principe que le Gardien d'EMDC : un cerveau interchangeable. Le cœur
// appelle « parler(...) » sans avoir à savoir à qui il parle. Deux familles :
//   • anthropic  — Claude en natif (réflexion, cache de prompt, vision fine).
//   • openai     — le dialecte commun à presque tous les autres (DeepSeek, Groq,
//                  OpenRouter, Mistral, OpenAI), traduit dans les deux sens.
//
// Par défaut par configuration : DeepSeek (très bon marché pour une app
// multi-clients grand public, comme adopté par EMDC Copilote).

import { CFG } from './config.js';
import { secret } from './coffre.js';

export const FOURNISSEURS = {
  deepseek: {
    nom: 'DeepSeek', dialecte: 'openai',
    url: 'https://api.deepseek.com/v1',
    modeles: ['deepseek-chat', 'deepseek-reasoner'],
    note: 'Très bon marché, solide sur le code. Réglage par défaut du cœur natif.',
  },
  anthropic: {
    nom: 'Anthropic (Claude)', dialecte: 'anthropic', url: null,
    modeles: ['claude-sonnet-5', 'claude-haiku-4-5'],
    note: 'Le plus complet : vision, réflexion visible, lecture PDF.',
  },
  mistral: {
    nom: 'Mistral (français)', dialecte: 'openai', url: 'https://api.mistral.ai/v1',
    modeles: ['mistral-large-latest', 'mistral-small-latest'],
    note: 'Fournisseur européen, offre gratuite disponible.',
  },
  groq: {
    nom: 'Groq', dialecte: 'openai', url: 'https://api.groq.com/openai/v1',
    modeles: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
    note: 'Gratuit et très rapide, petit quota par minute.',
    capacite: 'reduite',
  },
  openrouter: {
    nom: 'OpenRouter', dialecte: 'openai', url: 'https://openrouter.ai/api/v1',
    modeles: ['deepseek/deepseek-chat-v3.1:free'],
    note: 'Un seul compte pour des dizaines de modèles, dont des gratuits.',
  },
  openai: {
    nom: 'OpenAI', dialecte: 'openai', url: 'https://api.openai.com/v1',
    modeles: ['gpt-4.1-mini'],
    note: 'Classique, payant.',
  },
};

/** Réglage courant du cerveau. */
export function cerveauActuel() {
  const id = CFG.LLM_FOURNISSEUR || 'deepseek';
  const f = FOURNISSEURS[id] || FOURNISSEURS.deepseek;
  return {
    fournisseur: id,
    dialecte: f.dialecte,
    modele: CFG.LLM_MODELE || (f.modeles && f.modeles[0]) || '',
    apiKey: secret('LLM_API_KEY'),
    url: f.dialecte === 'anthropic' ? null : (secret('LLM_BASE_URL') || f.url || '').replace(/\/+$/, ''),
    capacite: f.capacite || 'normale',
  };
}

/* ── Traduction vers le dialecte OpenAI ── */

export function messagesVersOpenAI(messages, system) {
  const out = system ? [{ role: 'system', content: system }] : [];
  for (const m of messages) {
    if (typeof m.content === 'string') { out.push({ role: m.role, content: m.content }); continue; }
    const blocs = Array.isArray(m.content) ? m.content : [];
    let texte = '';
    for (const b of blocs) {
      if (b.type === 'text') texte += (texte ? '\n' : '') + b.text;
      else if (b.type === 'image' && b.source?.data) {
        texte += (texte ? '\n' : '') + `[image:data:${b.source.media_type || 'image/jpeg'};base64,${b.source.data}]`;
      }
    }
    out.push({ role: m.role, content: texte || '…' });
  }
  return out;
}

/** Réponse d'un fournisseur, ramenée à une forme commune. */
export function reponseCommune(d) {
  const msg = d?.choices?.[0]?.message || {};
  return {
    contenu: String(msg.content || ''),
    raisonnement: msg.reasoning_content ? String(msg.reasoning_content) : null,
    stop: d?.choices?.[0]?.finish_reason || 'end_turn',
    usage: { entree: d?.usage?.prompt_tokens ?? 0, sortie: d?.usage?.completion_tokens ?? 0 },
  };
}

/**
 * Un tour de parole du cerveau. Rend toujours
 * { contenu, raisonnement, stop, usage } — quel que soit le fournisseur.
 * Seule fonction à laquelle l'orchestrateur fait appel.
 */
export async function parler({ system = '', messages = [], maxTokens = 4000, temperature = 0.7 }) {
  const c = cerveauActuel();
  if (!c.apiKey) {
    throw new Error(`Aucune clé enregistrée pour ${FOURNISSEURS[c.fournisseur]?.nom || c.fournisseur}.`);
  }

  // Dialecte Anthropic : Claude en natif.
  if (c.dialecte === 'anthropic') {
    const sdk = await import('@anthropic-ai/sdk');
    const client = new sdk.default({ apiKey: c.apiKey });
    const res = await client.messages.create({
      model: c.modele,
      max_tokens: maxTokens,
      system,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : (m.content || []).map((b) => b.text || '').join('\n'),
      })),
    });
    return {
      contenu: (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n'),
      raisonnement: null,
      stop: res.stop_reason || 'end_turn',
      usage: { entree: res.usage?.input_tokens ?? 0, sortie: res.usage?.output_tokens ?? 0 },
    };
  }

  // Dialecte OpenAI : le reste.
  if (!c.url) throw new Error("Adresse du service non renseignée.");
  const place = c.capacite === 'reduite' ? 2000 : Math.min(maxTokens, 4000);
  const corps = { model: c.modele, max_tokens: place, temperature, messages: messagesVersOpenAI(messages, system) };
  const res = await fetch(`${c.url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${c.apiKey}`,
      'HTTP-Referer': 'https://emdcconsulting.com',
      'X-Title': 'EMDC Copilote',
    },
    body: JSON.stringify(corps),
  });
  const texte = await res.text();
  let d = null;
  try { d = JSON.parse(texte); } catch { /* réponse illisible */ }
  if (!res.ok) {
    const m = d?.error?.message || texte.slice(0, 300);
    const nom = FOURNISSEURS[c.fournisseur]?.nom || c.fournisseur;
    if (res.status === 401) throw new Error(`Clé refusée par ${nom}.`);
    if (res.status === 402 || /quota|credit|insufficient/i.test(m)) throw new Error(`Plus de crédit chez ${nom}.`);
    throw new Error(`${nom} ${res.status} : ${m}`);
  }
  if (!d) throw new Error(`Réponse illisible de ${c.fournisseur}.`);
  return reponseCommune(d);
}

/** Test de connexion, pour la validation à l'initialisation. */
export async function testerCerveau() {
  try {
    const r = await parler({ system: 'Réponds en un mot.', messages: [{ role: 'user', content: 'bonjour' }], maxTokens: 50 });
    return { ok: true, fournisseur: cerveauActuel().fournisseur, reponse: r.contenu.slice(0, 80) };
  } catch (e) {
    return { ok: false, erreur: String(e.message || e) };
  }
}
