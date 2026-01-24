-- 087_agent_memory.sql
-- Agent Memory System: Episodes, Facts, and Summaries with pgvector

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- EPISODES (Raw Interaction Logs)
-- ============================================
CREATE TABLE agent_memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,

  -- Episode content
  episode_type TEXT NOT NULL CHECK (episode_type IN ('conversation', 'scheduled_task', 'tool_execution')),
  content JSONB NOT NULL,

  -- Metadata for filtering
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  token_count INTEGER,

  -- Processing status
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_episodes_workspace ON agent_memory_episodes(workspace_id);
CREATE INDEX idx_episodes_user ON agent_memory_episodes(user_id);
CREATE INDEX idx_episodes_agent ON agent_memory_episodes(agent_id);
CREATE INDEX idx_episodes_type ON agent_memory_episodes(episode_type);
CREATE INDEX idx_episodes_unprocessed ON agent_memory_episodes(workspace_id)
  WHERE is_processed = FALSE;
CREATE INDEX idx_episodes_created ON agent_memory_episodes(created_at DESC);

-- ============================================
-- FACTS (Extracted Memory Items)
-- ============================================
CREATE TABLE agent_memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Scoping
  scope TEXT NOT NULL CHECK (scope IN ('user', 'workspace', 'agent')),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Content
  fact_type TEXT NOT NULL CHECK (fact_type IN ('preference', 'context', 'knowledge', 'relationship')),
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-ada-002 dimension

  -- Source tracing
  source_episode_id UUID REFERENCES agent_memory_episodes(id) ON DELETE SET NULL,
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),

  -- Lifecycle
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  decay_factor FLOAT DEFAULT 1.0 CHECK (decay_factor >= 0 AND decay_factor <= 1),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  superseded_by UUID REFERENCES agent_memory_facts(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facts_workspace_scope ON agent_memory_facts(workspace_id, scope);
CREATE INDEX idx_facts_user ON agent_memory_facts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_facts_agent ON agent_memory_facts(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_facts_type ON agent_memory_facts(fact_type);
CREATE INDEX idx_facts_active ON agent_memory_facts(workspace_id) WHERE is_active = TRUE;
CREATE INDEX idx_facts_source_episode ON agent_memory_facts(source_episode_id);
CREATE INDEX idx_facts_created ON agent_memory_facts(created_at DESC);

-- Vector index for semantic search (using ivfflat for better performance with large datasets)
-- Note: This index works best when you have at least 1000 rows
CREATE INDEX idx_facts_embedding ON agent_memory_facts
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- SUMMARIES (Consolidated Knowledge)
-- ============================================
CREATE TABLE agent_memory_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Scoping
  scope TEXT NOT NULL CHECK (scope IN ('user', 'workspace', 'agent')),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Content
  category TEXT NOT NULL CHECK (category IN ('user_profile', 'project_context', 'domain_knowledge', 'communication_style', 'workflow')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),

  -- Source facts
  source_fact_ids UUID[] DEFAULT '{}',
  fact_count INTEGER DEFAULT 0,

  -- Lifecycle
  last_consolidated_at TIMESTAMPTZ DEFAULT NOW(),
  consolidation_count INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per scope/category/user combination
  UNIQUE(workspace_id, scope, category, user_id)
);

CREATE INDEX idx_summaries_workspace ON agent_memory_summaries(workspace_id, scope);
CREATE INDEX idx_summaries_category ON agent_memory_summaries(workspace_id, category);
CREATE INDEX idx_summaries_user ON agent_memory_summaries(user_id) WHERE user_id IS NOT NULL;

-- Vector index for semantic search
CREATE INDEX idx_summaries_embedding ON agent_memory_summaries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================
-- RETRIEVAL FUNCTIONS
-- ============================================

-- Semantic search across facts
CREATE OR REPLACE FUNCTION match_memory_facts(
  query_embedding vector(1536),
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_scope TEXT DEFAULT NULL,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  fact_type TEXT,
  scope TEXT,
  importance FLOAT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.content,
    f.fact_type,
    f.scope,
    f.importance,
    1 - (f.embedding <=> query_embedding) as similarity
  FROM agent_memory_facts f
  WHERE f.workspace_id = p_workspace_id
    AND f.is_active = TRUE
    AND f.embedding IS NOT NULL
    AND (p_scope IS NULL OR f.scope = p_scope)
    AND (
      f.scope = 'workspace'
      OR (f.scope = 'user' AND (p_user_id IS NULL OR f.user_id = p_user_id))
      OR (f.scope = 'agent')
    )
    AND 1 - (f.embedding <=> query_embedding) > similarity_threshold
  ORDER BY
    (1 - (f.embedding <=> query_embedding)) * f.importance * f.decay_factor DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Combined search across facts and summaries
CREATE OR REPLACE FUNCTION recall_memories(
  query_embedding vector(1536),
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  source_type TEXT,
  id UUID,
  content TEXT,
  category TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'fact'::TEXT as source_type,
      f.id,
      f.content,
      f.fact_type as category,
      1 - (f.embedding <=> query_embedding) as similarity
    FROM agent_memory_facts f
    WHERE f.workspace_id = p_workspace_id
      AND f.is_active = TRUE
      AND f.embedding IS NOT NULL
      AND (f.scope = 'workspace' OR f.user_id = p_user_id)
    ORDER BY f.embedding <=> query_embedding
    LIMIT match_count
  )
  UNION ALL
  (
    SELECT
      'summary'::TEXT as source_type,
      s.id,
      s.content,
      s.category,
      1 - (s.embedding <=> query_embedding) as similarity
    FROM agent_memory_summaries s
    WHERE s.workspace_id = p_workspace_id
      AND s.embedding IS NOT NULL
      AND (s.scope = 'workspace' OR s.user_id = p_user_id)
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count / 2
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update fact access tracking
CREATE OR REPLACE FUNCTION update_fact_access(fact_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE agent_memory_facts
  SET
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE id = ANY(fact_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to decay unused memories
CREATE OR REPLACE FUNCTION decay_unused_memories(
  p_workspace_id UUID,
  days_threshold INT DEFAULT 30,
  decay_rate FLOAT DEFAULT 0.9
)
RETURNS INT AS $$
DECLARE
  affected_count INT;
BEGIN
  UPDATE agent_memory_facts
  SET
    decay_factor = GREATEST(decay_factor * decay_rate, 0.1),
    updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND is_active = TRUE
    AND (last_accessed_at IS NULL OR last_accessed_at < NOW() - (days_threshold || ' days')::interval);

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Deactivate facts with very low decay and importance
  UPDATE agent_memory_facts
  SET
    is_active = FALSE,
    updated_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND decay_factor < 0.1
    AND importance < 0.5;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agent_memory_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_summaries ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage everything
CREATE POLICY "Superadmins can manage episodes"
ON agent_memory_episodes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage facts"
ON agent_memory_facts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage summaries"
ON agent_memory_summaries FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_agent_memory_facts_updated_at
      BEFORE UPDATE ON agent_memory_facts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_agent_memory_summaries_updated_at
      BEFORE UPDATE ON agent_memory_summaries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Triggers already exist, ignore
  NULL;
END $$;
