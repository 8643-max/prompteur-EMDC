-- ============================================================================
-- Ajout d'une etape en un seul appel atomique  —  21/08/2026
--
-- POURQUOI
-- `noter_etape` passe aujourd'hui par le sous-workflow `ASYNC - Noter etape`,
-- qui fait un lire-modifier-ecrire en deux requetes. Deux consequences :
--
--   1. COUT : sur n8n Cloud un sous-workflow compte comme une execution
--      separee. Chaque etape affichee au client coute donc une execution --
--      environ 5 par mission, le poste le plus lourd apres le sondage.
--
--   2. CORRECTION : le lire-modifier-ecrire n'est pas atomique. Deux etapes
--      ecrites au meme instant se lisent le meme tableau et la seconde ecrase
--      la premiere. Une etape peut donc disparaitre sans erreur visible.
--
-- Cette fonction fait les deux en une seule requete, cote base, sans course.
--
-- A EXECUTER DANS : Supabase -> SQL Editor. Idempotente (create or replace).
--
-- /!\ ORDRE : ce SQL doit passer AVANT que l'outil n8n ne soit rebranche
-- dessus, sinon les clients perdent l'affichage des etapes en direct.
-- ============================================================================

create or replace function public.ajouter_etape(p_job_id uuid, p_texte text)
returns void
language sql
security definer
set search_path = public
as $fonction$
  update public.jobs
     set etapes = coalesce(etapes, '[]'::jsonb) || jsonb_build_array(
                    jsonb_build_object(
                      'quand', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                      'texte', left(btrim(p_texte), 500)
                    )
                  )
   where id = p_job_id
     -- Meme garde-fou que partout ailleurs : un job annule n'est plus ecrit.
     and statut <> 'annule'
     -- Une etape vide ne sert a rien et polluerait l'affichage du client.
     and btrim(coalesce(p_texte, '')) <> '';
$fonction$;

comment on function public.ajouter_etape(uuid, text) is
  'Ajoute une etape au recit en direct d''un job, de facon atomique. '
  'Remplace le sous-workflow ASYNC - Noter etape : une execution n8n economisee '
  'par etape, et plus de risque d''ecrasement entre deux etapes simultanees.';

-- Seul n8n appelle cette fonction, avec la cle service_role. Ni un visiteur
-- anonyme ni un client connecte ne doivent pouvoir ecrire dans le recit d'un
-- job -- meme le sien : les etapes racontent ce que l'agent a fait.
revoke all on function public.ajouter_etape(uuid, text) from public;
revoke all on function public.ajouter_etape(uuid, text) from anon;
revoke all on function public.ajouter_etape(uuid, text) from authenticated;
grant execute on function public.ajouter_etape(uuid, text) to service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
--        p.prosecdef as security_definer
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname = 'ajouter_etape';
--
-- Qui a le droit de l'appeler (doit ne lister que service_role) :
-- select grantee, privilege_type from information_schema.routine_privileges
--  where routine_schema = 'public' and routine_name = 'ajouter_etape';

-- ============================================================================
-- RETOUR ARRIERE
-- ============================================================================
-- drop function if exists public.ajouter_etape(uuid, text);
-- ... a ne faire qu'apres avoir rebranche l'outil n8n sur le sous-workflow.
