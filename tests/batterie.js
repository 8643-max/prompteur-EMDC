#!/usr/bin/env node
/* ============================================================================
 * EMDC Copilote — batterie de tests rejouable
 *
 * POURQUOI CE FICHIER EXISTE
 * Le 21/08/2026, le nettoyage quotidien annoncait « succes » depuis des mois
 * alors que 4 purges sur 5 etaient cassees. Un noeud n8n peut rapporter
 * `success` tout en renvoyant un objet `error` dans ses donnees. Rien de tout
 * cela n'etait visible sans executer et LIRE LE CONTENU des sorties.
 *
 * UTILISATION
 *   node tests/batterie.js              # tests gratuits uniquement
 *   node tests/batterie.js --complet    # ajoute les tests qui consomment
 *                                       # des executions n8n et des jetons
 *
 * VARIABLES D'ENVIRONNEMENT
 *   N8N_API_KEY       requise pour lire les executions n8n (jamais commitee)
 *   EMDC_TEST_EMAIL   compte utilise par les tests --complet
 *
 * Sortie : code 0 si tout passe, 1 sinon. Utilisable en CI.
 * ========================================================================== */

const N8N = 'https://eldji8643.app.n8n.cloud';
const SUPA = 'https://tjyvogckvkbqoagxmflg.supabase.co';

// Cle anonyme Supabase : deja publique dans copilote/index.html, elle ne donne
// rien sans authentification. Aucun secret ne doit entrer dans ce fichier.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXZvZ2NrdmticW9hZ3htZmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjI4OTIsImV4cCI6MjEwMjE5ODg5Mn0.ciB4XQnLhmjjUvCDNJKZBdAaIbP1zGSXOR2MLsRnO48';

const CLE_N8N = process.env.N8N_API_KEY || '';
const EMAIL = process.env.EMDC_TEST_EMAIL || '';
const COMPLET = process.argv.includes('--complet');

const WF = {
  routeur: 'FiDtwermqUx6MMTF',
  worker: '8m60kjRN0xtB2Lng',
  nettoyage: 'YvrMe8LvKv3yGA0h',
};

const WORKERS_VALIDES = ['general', 'documents', 'web', 'rag', 'fichier'];

/* ── petit harnais ───────────────────────────────────────────────────── */
const resultats = [];
let ignores = 0;

async function test(nom, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultats.push({ nom, ok: true, ms: Date.now() - t0 });
    console.log(`  OK      ${nom}  (${Date.now() - t0} ms)`);
  } catch (e) {
    resultats.push({ nom, ok: false, ms: Date.now() - t0, err: e.message });
    console.log(`  ECHEC   ${nom}\n            -> ${e.message}`);
  }
}

function ignorer(nom, raison) {
  ignores++;
  console.log(`  ignore  ${nom}  (${raison})`);
}

function verifier(condition, message) {
  if (!condition) throw new Error(message);
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

async function jsonN8n(chemin) {
  const r = await fetch(N8N + chemin, { headers: { 'X-N8N-API-KEY': CLE_N8N } });
  verifier(r.ok, `n8n ${chemin} a repondu ${r.status}`);
  return r.json();
}

// Derniere execution d'un workflow, avec ses donnees.
async function derniereExecution(workflowId) {
  const l = await jsonN8n(`/api/v1/executions?workflowId=${workflowId}&limit=1`);
  verifier(l.data && l.data.length, 'aucune execution trouvee');
  return jsonN8n(`/api/v1/executions/${l.data[0].id}?includeData=true`);
}

// Cherche une erreur REELLE : le statut ne suffit pas, un noeud peut rendre
// `success` en ayant un objet `error` dans ses donnees. C'est le piege qui a
// masque la panne du nettoyage pendant des mois.
function erreursReelles(execution) {
  const rd = ((execution.data || {}).resultData || {}).runData || {};
  const trouvees = [];
  for (const [nom, runs] of Object.entries(rd)) {
    for (const r of runs) {
      if (r.error) { trouvees.push(`${nom}: ${r.error.message}`); continue; }
      let items = null;
      try { items = r.data.main[0]; } catch (_) { items = null; }
      for (const it of items || []) {
        const j = (it && it.json) || {};
        if (j && j.error) {
          const e = j.error;
          const msg = (e.cause && e.cause.message) || e.description || e.message;
          trouvees.push(`${nom}: ${String(msg).slice(0, 140)}`);
        }
      }
    }
  }
  return trouvees;
}

function sortieDuNoeud(execution, nom) {
  const rd = ((execution.data || {}).resultData || {}).runData || {};
  const runs = rd[nom];
  if (!runs || !runs.length) return null;
  try { return runs[0].data.main[0]; } catch (_) { return null; }
}

/* ── lancement d'une vraie demande dans la file ──────────────────────── */
async function lancerDemande(message, sessionId) {
  const t0 = Date.now();
  const r = await fetch(N8N + '/webhook/saas/chat-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat', message, user: 'Batterie de tests', email: EMAIL,
      user_id: EMAIL, session_id: sessionId, history: [],
      lang: 'fr', mode: 'standard', tool: null,
    }),
  });
  const j = await r.json();
  return { statut: r.status, corps: j, ms: Date.now() - t0 };
}

async function attendreJob(jobId, userId, maxMs = 180000) {
  const debut = Date.now();
  while (Date.now() - debut < maxMs) {
    await dormir(3000);
    const r = await fetch(N8N + '/webhook/saas/async/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, user_id: userId }),
    });
    if (!r.ok) continue;
    const j = await r.json().catch(() => null);
    if (j && ['termine', 'erreur', 'annule'].includes(j.statut)) return j;
  }
  throw new Error('la tache n a pas abouti en ' + (maxMs / 1000) + ' s');
}

/* ══ LES TESTS ══════════════════════════════════════════════════════════ */
async function main() {
  console.log('\nEMDC Copilote — batterie de tests');
  console.log('mode :', COMPLET ? 'COMPLET (consomme executions et jetons)' : 'rapide (gratuit)');
  console.log('');

  /* ── 1. Cloisonnement des donnees (gratuit) ───────────────────────── */
  console.log('Cloisonnement des donnees');

  for (const table of ['jobs', 'token_balances', 'task_queue', 'session_memory']) {
    await test(`RLS : ${table} illisible sans authentification`, async () => {
      const r = await fetch(`${SUPA}/rest/v1/${table}?select=*&limit=5`, {
        headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
      });
      verifier(r.ok, `PostgREST a repondu ${r.status}`);
      const lignes = await r.json();
      verifier(Array.isArray(lignes), 'reponse inattendue');
      verifier(lignes.length === 0,
        `FUITE : ${lignes.length} ligne(s) lisibles anonymement dans ${table}`);
    });
  }

  /* ── 2. Etat des workflows (gratuit, lecture seule) ───────────────── */
  console.log('\nEtat des workflows');
  if (!CLE_N8N) {
    ignorer('tous les tests n8n', 'N8N_API_KEY absente de l environnement');
  } else {
    await test('Routeur et Worker sont actifs', async () => {
      for (const [nom, id] of [['Routeur', WF.routeur], ['Worker', WF.worker]]) {
        const w = await jsonN8n('/api/v1/workflows/' + id);
        verifier(w.active === true, `${nom} est desactive`);
      }
    });

    await test('Le nettoyage quotidien s est execute sans erreur reelle', async () => {
      const ex = await derniereExecution(WF.nettoyage);
      const err = erreursReelles(ex);
      verifier(err.length === 0, 'erreurs dans la derniere execution :\n            ' + err.join('\n            '));
    });

    await test('Le nettoyage purge bien les 6 tables attendues', async () => {
      const w = await jsonN8n('/api/v1/workflows/' + WF.nettoyage);
      const noms = w.nodes.map(n => n.name);
      for (const attendu of ['conversation_logs', 'document_analyses', 'error_logs',
        'jobs', 'task_queue', 'session_memory']) {
        verifier(noms.some(n => n.includes(attendu)), `purge ${attendu} absente`);
      }
      // Les purges doivent partir du declencheur, jamais en serie : une purge
      // sans resultat ne produit aucun element et sauterait tout l'aval.
      const sorties = (w.connections['Tous les jours 03h'] || {}).main || [[]];
      verifier(sorties[0].length >= 7,
        `les purges ne sont pas toutes branchees en parallele (${sorties[0].length} branches)`);
    });

    await test('Aucune date d URL ne peut etre cassee par le signe +', async () => {
      // toISO() rend "+02:00" et le + vaut ESPACE dans une URL : Postgres
      // refuse. Ce test a ete ecrit apres que `jobs` n ait jamais ete purge.
      const w = await jsonN8n('/api/v1/workflows/' + WF.nettoyage);
      for (const n of w.nodes) {
        const u = (n.parameters || {}).url || '';
        if (u.includes('/rest/v1/') && u.includes('toISO()')) {
          verifier(u.includes('toUTC().toISO()'),
            `${n.name} utilise toISO() sans toUTC() : la date contiendra un +`);
        }
      }
    });
  }

  /* ── 3. Bout en bout (payant) ─────────────────────────────────────── */
  console.log('\nChaine complete');
  if (!COMPLET) {
    ignorer('tests de bout en bout', 'lancer avec --complet');
  } else if (!CLE_N8N || !EMAIL) {
    ignorer('tests de bout en bout', 'N8N_API_KEY ou EMDC_TEST_EMAIL absente');
  } else {
    const sid = 'batterie-' + Date.now();
    let job = null;

    await test('Accuse de reception sous 3 secondes avec un job_id', async () => {
      const r = await lancerDemande('En une phrase, qu est-ce qu une facture ?', sid);
      verifier(r.statut === 202, `HTTP ${r.statut} au lieu de 202`);
      verifier(r.corps && r.corps.job_id, 'aucun job_id rendu');
      verifier(r.ms < 3000, `accuse de reception en ${r.ms} ms`);
      job = r.corps.job_id;
    });

    await test('L Orchestrateur affecte un specialiste valide', async () => {
      await dormir(4000);
      const ex = await derniereExecution(WF.routeur);
      const err = erreursReelles(ex);
      verifier(err.length === 0, 'erreurs dans le Routeur : ' + err.join(' | '));
      const taches = sortieDuNoeud(ex, 'Preparer les taches');
      verifier(taches && taches.length, 'aucune tache preparee');
      for (const t of taches) {
        const w = (t.json || {}).target_worker;
        verifier(w, 'target_worker absent de la tache');
        verifier(WORKERS_VALIDES.includes(w), `specialiste inconnu : ${w}`);
        verifier((t.json || {}).retries === 0, 'retries doit demarrer a 0');
      }
    });

    await test('Une question ne produit qu une seule tache', async () => {
      const ex = await derniereExecution(WF.routeur);
      const taches = sortieDuNoeud(ex, 'Preparer les taches');
      verifier(taches.length === 1,
        `${taches.length} taches pour une simple question : le garde-fou a laisse passer`);
    });

    await test('La mission aboutit et rend une reponse', async () => {
      const fin = await attendreJob(job, EMAIL);
      verifier(fin.statut === 'termine', `statut final : ${fin.statut}`);
      verifier(fin.resultat && fin.resultat.length > 40, 'reponse vide ou trop courte');
      global.__reponse = fin.resultat;
    });

    await test('La reponse n est pas un compte rendu numerote', async () => {
      // Une tache unique doit rendre la reponse de l agent telle quelle.
      const r = global.__reponse || '';
      verifier(!r.includes('Voici ce que j ai fait, etape par etape'),
        'la reponse est habillee en compte rendu alors qu il n y a qu une tache');
    });

    await test('La reponse ne commence par aucun preambule interdit', async () => {
      const r = (global.__reponse || '').slice(0, 160).toLowerCase();
      const interdits = ['je comprends', 'excellente question', 'tres bonne question',
        'je vais vous aider', 'bien sur !', 'avec plaisir', 'laissez-moi vous expliquer',
        'pas de souci'];
      const trouve = interdits.find(p => r.includes(p));
      verifier(!trouve, `preambule interdit detecte : « ${trouve} »`);
    });

    await test('Isolation : une session ne lit pas le job d une autre', async () => {
      const r = await fetch(N8N + '/webhook/saas/async/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job, user_id: 'intrus@exemple.invalid' }),
      });
      const j = await r.json().catch(() => null);
      verifier(!(j && j.success && j.resultat),
        'FUITE : le job est lisible avec un autre user_id');
    });
  }

  /* ── bilan ────────────────────────────────────────────────────────── */
  const echecs = resultats.filter(r => !r.ok);
  console.log('\n' + '-'.repeat(64));
  console.log(`${resultats.length - echecs.length} reussis · ${echecs.length} echecs · ${ignores} ignores`);
  if (echecs.length) {
    console.log('\nEchecs :');
    echecs.forEach(e => console.log(`  . ${e.nom}\n    ${e.err}`));
  }
  console.log('');
  process.exit(echecs.length ? 1 : 0);
}

main().catch(e => { console.error('\nbatterie interrompue :', e.message, '\n'); process.exit(1); });
