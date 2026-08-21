-- ============================================================================
-- Suivi des jobs par Supabase Realtime  —  21/08/2026
--
-- POURQUOI : le front interrogeait n8n (saas/async/status) toutes les 2 s pour
-- savoir ou en etait un job. Mesure du 21/08/2026 sur 250 executions n8n :
-- 156 (62 %) etaient ce seul sondage, pour 12 vraies demandes clients.
-- Le statut vit deja dans la table `jobs` : le navigateur peut le lire lui-meme.
--
-- EFFET ATTENDU : ~168 -> ~63 executions n8n / jour, et affichage instantane
-- des etapes au lieu d'un retard pouvant aller jusqu'a 2 secondes.
--
-- A EXECUTER DANS : Supabase -> SQL Editor. Idempotent, rejouable sans risque.
-- ============================================================================

-- 1) Chaque client connecte peut LIRE ses propres jobs, et uniquement les siens.
--    `jobs.user_id` contient l'EMAIL du client (verifie le 21/08/2026 : le front
--    envoie S.user.email, il n'y a pas d'identifiant auth.uid() dans S.user).
--    Aucune permission d'ecriture n'est accordee : les workers n8n continuent
--    d'ecrire avec la cle service_role, qui contourne la RLS.
alter table public.jobs enable row level security;

drop policy if exists "jobs_lecture_proprietaire" on public.jobs;
create policy "jobs_lecture_proprietaire"
  on public.jobs
  for select
  to authenticated
  using ( lower(user_id) = lower(auth.jwt() ->> 'email') );

-- 2) Diffuser les changements de `jobs` aux navigateurs abonnes.
--    La RLS ci-dessus s'applique aussi au Realtime : un client ne recoit
--    que les evenements de SES lignes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end $$;

-- ============================================================================
-- VERIFICATION (a executer apres, doit renvoyer une ligne chacune)
-- ============================================================================
-- select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='jobs';
--
-- select * from pg_publication_tables
--   where pubname='supabase_realtime' and tablename='jobs';

-- ============================================================================
-- RETOUR ARRIERE
-- ============================================================================
-- drop policy if exists "jobs_lecture_proprietaire" on public.jobs;
-- alter publication supabase_realtime drop table public.jobs;
-- ... puis passer SUIVI_REALTIME_ACTIF a false dans copilote/index.html.
-- Le front retombe seul sur le sondage n8n : aucune coupure de service.
