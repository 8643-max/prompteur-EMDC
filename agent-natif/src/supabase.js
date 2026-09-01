// Accès Postgres à Supabase pour le cœur de l'agent natif.
// Même approche éprouvée que le Gardien : un pool Postgres, lecture encadrée,
// exécution avec repli de test en transaction annulée.

import pg from 'pg';
import { secret } from './coffre.js';

let pool = null;

/** True si la connexion DB est renseignée. */
export function sbConfigured() { return !!secret('SUPABASE_DB_URL'); }

function getPool() {
  const url = secret('SUPABASE_DB_URL');
  if (!url) throw new Error('Connexion Supabase non configurée.');
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 4, connectionTimeoutMillis: 8000, idleTimeoutMillis: 20000,
    });
    pool.on('error', () => {});
  }
  return pool;
}

/** Prévient la sélection dangereuse : lecture réservée aux SELECT/WITH simples. */
export function estLecture(sql) {
  const s = String(sql).trim().toLowerCase().replace(/;\s*$/, '');
  return /^(select|with|explain|show)\b/.test(s) && !s.includes(';');
}

/** Lecture (SELECT) simple, bornée. */
export async function sbRead(sql, limit = 200) {
  if (!estLecture(sql)) throw new Error('Réservé à la lecture (SELECT/WITH).');
  const r = await getPool().query(sql);
  const lignes = r.rows.slice(0, limit);
  return { colonnes: r.fields.map((f) => f.name), lignes, ramene: lignes.length, tronque: r.rows.length > limit };
}

/** Exécute une instruction ; dryRun=true la joue puis l'annule (rien de gardé). */
export async function sbExec(sql, dryRun = false) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(sql);
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return dryRun
      ? { teste: true, applique: false, message: 'Valide (joué puis annulé — rien de gardé).', lignes: r.rowCount ?? null }
      : { teste: false, applique: true, message: 'Exécuté et validé.', lignes: r.rowCount ?? null };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('Échec : ' + (e.message || e));
  } finally {
    client.release();
  }
}
