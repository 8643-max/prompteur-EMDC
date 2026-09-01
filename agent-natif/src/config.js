// Configuration centrale du cœur de l'agent natif.
// Tout vient de l'environnement (.env du conteneur sur le VPS).
// Aucun secret n'est écrit en dur ici.

export const CFG = {
  PORT: parseInt(process.env.PORT || '3100', 10),

  // Cerveau LLM — par défaut DeepSeek (très bon marché, adopté par EMDC).
  LLM_FOURNISSEUR: process.env.LLM_FOURNISSEUR || 'deepseek',
  LLM_MODELE: process.env.LLM_MODELE || 'deepseek-chat',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_BASE_URL: process.env.LLM_BASE_URL || '',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL || '',

  // Sécurité des endpoints
  AGENT_SIGNING_SECRET: process.env.AGENT_SIGNING_SECRET || '',

  // Divers
  SENTINEL_INTERVAL_MS: parseInt(process.env.SENTINEL_INTERVAL_MS || '300000', 10),
};

/** Liste des variables indispensables au démarrage, manquantes. */
export function missingCritical() {
  const req = ['SUPABASE_URL', 'SUPABASE_DB_URL'];
  return req.filter((k) => !CFG[k]);
}
