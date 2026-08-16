-- ═══════════════════════════════════════════════════════
-- MIGRATION RAG MULTI-TENANT - EMDC Copilote d'Entreprise
-- Chaque client a son propre espace documentaire privé
-- ═══════════════════════════════════════════════════════

-- 1. Activer pgvector si pas encore fait
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Recréer la table documents avec support user_id (vide, aucun risque)
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
  id        bigserial PRIMARY KEY,
  content   text,
  metadata  jsonb DEFAULT '{}',
  embedding vector(1024),
  user_id   text NOT NULL DEFAULT 'shared',
  filename  text,
  created_at timestamptz DEFAULT now()
);

-- 3. Index pour la recherche rapide par user_id
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin(metadata);

-- 4. Fonction de recherche principale avec filtre user_id
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_count     int  DEFAULT 5,
  filter          jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id::bigint,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE
    d.metadata @> filter
    AND (filter->>'user_id' IS NULL OR d.user_id = filter->>'user_id')
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Fonction pour lister les documents d'un utilisateur
CREATE OR REPLACE FUNCTION list_user_documents(p_user_id text)
RETURNS TABLE (
  id         bigint,
  filename   text,
  created_at timestamptz,
  char_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id::bigint,
    COALESCE(d.filename, d.metadata->>'source', 'Document sans nom') AS filename,
    d.created_at,
    LENGTH(d.content)::int AS char_count
  FROM documents d
  WHERE d.user_id = p_user_id
  ORDER BY d.created_at DESC;
END;
$$;

-- 6. Fonction pour supprimer tous les chunks d'un document
CREATE OR REPLACE FUNCTION delete_user_document(p_user_id text, p_filename text)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM documents
  WHERE user_id = p_user_id
    AND (filename = p_filename OR metadata->>'source' = p_filename);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 7. RLS : chaque utilisateur ne voit que ses propres documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture (les utilisateurs voient leurs docs)
CREATE POLICY "users_read_own_docs" ON documents
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

-- Service role bypass (pour n8n qui utilise la service role key)
CREATE POLICY "service_role_all" ON documents
  FOR ALL USING (auth.role() = 'service_role');

-- 8. Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION match_documents TO service_role, anon;
GRANT EXECUTE ON FUNCTION list_user_documents TO service_role, anon;
GRANT EXECUTE ON FUNCTION delete_user_document TO service_role, anon;
GRANT ALL ON documents TO service_role;

-- 9. Vérification finale
SELECT 'Migration terminee avec succes' AS status;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'documents' ORDER BY ordinal_position;
