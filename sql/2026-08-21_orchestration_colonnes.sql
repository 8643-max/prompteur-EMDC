-- ============================================================================
-- Orchestration multi-agents : les deux colonnes manquantes  —  21/08/2026
--
-- POURQUOI : le cahier des charges "ARCHITECTURE MULTI-AGENTS EMDC" exige que
-- chaque sous-tache porte le Worker qui doit l'executer, et un compteur de
-- tentatives pour l'auto-correction. Verifie par sonde PostgREST le 21/08 :
-- ni l'une ni l'autre n'existe dans task_queue.
--
-- Sans elles :
--   - l'Orchestrateur ne peut pas aiguiller vers un Worker specialise ;
--   - l'auto-correction (3 essais avant abandon) n'a nulle part ou compter.
--
-- A EXECUTER DANS : Supabase -> SQL Editor. Idempotent, rejouable sans risque.
--
-- /!\ ORDRE IMPORTANT : ce SQL doit passer AVANT que le Routeur n8n ne se mette
-- a ecrire `target_worker`. Un INSERT PostgREST vers une colonne inexistante
-- echoue, et la file d'attente casserait pour les clients en cours.
-- ============================================================================

-- Le Worker charge de la tache. Valeur par defaut 'general' : les taches deja
-- en file et toute valeur inconnue retombent sur l'agent generalise actuel,
-- qui porte les 8 outils. Aucune rupture pour l'existant.
alter table public.task_queue
  add column if not exists target_worker text not null default 'general';

-- Nombre de tentatives deja faites sur cette tache. L'auto-correction reinjecte
-- l'erreur au modele tant que retries < 3, puis marque la tache 'failed' et
-- laisse la mission continuer.
alter table public.task_queue
  add column if not exists retries integer not null default 0;

-- Volontairement PAS de contrainte CHECK sur target_worker : la valeur est
-- produite par un modele au moment du decoupage. Une contrainte ferait echouer
-- l'INSERT sur une faute de frappe, et la tache du client serait perdue.
-- Le garde-fou est cote n8n : le Switch du Worker retombe sur 'general' pour
-- toute valeur qu'il ne connait pas.
comment on column public.task_queue.target_worker is
  'Worker charge de la tache. Valeurs prevues : general, documents, web, rag, fichier. '
  'Toute valeur inconnue est traitee par l''agent general (repli du Switch n8n).';

comment on column public.task_queue.retries is
  'Tentatives deja effectuees. Auto-correction : reinjection de l''erreur tant que < 3.';

-- ============================================================================
-- VERIFICATION (doit renvoyer deux lignes)
-- ============================================================================
-- select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name = 'task_queue'
--    and column_name in ('target_worker', 'retries');

-- ============================================================================
-- RETOUR ARRIERE
-- ============================================================================
-- alter table public.task_queue drop column if exists target_worker;
-- alter table public.task_queue drop column if exists retries;
-- ... a ne faire que si le Routeur n'ecrit pas encore ces colonnes.
