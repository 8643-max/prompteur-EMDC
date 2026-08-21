-- ============================================================================
-- Lecture directe du solde de jetons  —  21/08/2026
--
-- POURQUOI : `refreshSupaTokens` interrogeait n8n (action check_balance) apres
-- CHAQUE message et a CHAQUE chargement de page. Cet appel declenche
-- `SaaS – Routeur Central (API)`, qui appelle `SaaS – Facturation par Jetons`
-- en sous-workflow : DEUX executions n8n juste pour lire un nombre.
--
-- Mesure du 21/08/2026, fenetre 09:21-09:22 : une seule analyse de fichier a
-- consomme 9 executions, dont 3 de facturation.
--
-- Le solde vit dans `token_balances` (user_id = email, balance = entier).
-- Le navigateur peut le lire lui-meme, comme il lit deja `jobs`.
--
-- A EXECUTER DANS : Supabase -> SQL Editor. Idempotent, rejouable sans risque.
-- ============================================================================

-- LECTURE SEULE, et uniquement sa propre ligne. Aucune permission d'ecriture :
-- les debits et les recharges continuent de passer par n8n avec la cle
-- service_role, qui contourne la RLS. Un client ne peut donc pas s'attribuer
-- des jetons -- il peut seulement lire le nombre qu'il voit deja a l'ecran.
alter table public.token_balances enable row level security;

drop policy if exists "token_balances_lecture_proprietaire" on public.token_balances;
create policy "token_balances_lecture_proprietaire"
  on public.token_balances
  for select
  to authenticated
  using ( lower(user_id) = lower(auth.jwt() ->> 'email') );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename='token_balances';
--
-- Les politiques d'ECRITURE doivent rester absentes pour 'authenticated' :
-- seule une ligne 'select' doit apparaitre.

-- ============================================================================
-- RETOUR ARRIERE
-- ============================================================================
-- drop policy if exists "token_balances_lecture_proprietaire" on public.token_balances;
-- Le front retombe seul sur l'appel n8n : aucune coupure de service.
