-- 062_agent_builder_extended.sql
-- Extended Agent Builder: Versions, Rules, Test Sessions, Prompt Sections

-- ============================================
-- AGENT VERSIONS (Version Control)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Snapshot of agent config at this version
  config_snapshot JSONB NOT NULL,

  -- Change tracking
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'identity', 'tools', 'skills', 'prompt', 'team', 'rules', 'rollback', 'published')),
  change_description TEXT,
  change_details JSONB DEFAULT '{}',

  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_published ON agent_versions(agent_id) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_agent_versions_created ON agent_versions(created_at DESC);

-- ============================================
-- AGENT RULES (Behavioral Guardrails)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Rule definition
  rule_type TEXT NOT NULL CHECK (rule_type IN ('always', 'never', 'when', 'respond_with')),
  rule_content TEXT NOT NULL,
  condition TEXT,  -- For 'when' type rules

  -- Ordering
  priority INTEGER DEFAULT 0,

  -- Metadata
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_rules_agent ON agent_rules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_rules_type ON agent_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_agent_rules_enabled ON agent_rules(agent_id) WHERE is_enabled = true;

-- ============================================
-- AGENT PROMPT SECTIONS (Structured Prompts)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_prompt_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Section definition
  section_type TEXT NOT NULL CHECK (section_type IN ('identity', 'personality', 'capabilities', 'constraints', 'examples', 'custom')),
  section_title TEXT NOT NULL,
  section_content TEXT NOT NULL,

  -- Ordering
  position INTEGER DEFAULT 0,

  -- Metadata
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_sections_agent ON agent_prompt_sections(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_sections_position ON agent_prompt_sections(agent_id, position);

-- ============================================
-- AGENT TEST SESSIONS (Sandbox Testing)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Session metadata
  started_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Configuration for this test
  test_config JSONB DEFAULT '{}',  -- tool_mode: 'mock' | 'simulate' | 'live'

  -- Results
  total_turns INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'timeout')),
  error_message TEXT,

  -- Notes
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_agent ON agent_test_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_started_by ON agent_test_sessions(started_by);
CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_status ON agent_test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_test_sessions_started ON agent_test_sessions(started_at DESC);

-- ============================================
-- AGENT TEST MESSAGES (Test Conversation History)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_test_sessions(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool_use', 'tool_result')),
  content TEXT NOT NULL,

  -- Tool call tracking
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  tool_use_id TEXT,  -- Claude's tool_use ID for matching results

  -- Performance metrics
  latency_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,

  -- Ordering
  sequence_number INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_test_messages_session ON agent_test_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_test_messages_sequence ON agent_test_messages(session_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_agent_test_messages_role ON agent_test_messages(role);

-- ============================================
-- EXTEND AI_AGENTS TABLE
-- ============================================
-- Add version tracking column if not exists
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS published_version INTEGER,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_agents_slug_unique'
  ) THEN
    ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Add index on slug
CREATE INDEX IF NOT EXISTS idx_ai_agents_slug ON ai_agents(slug);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompt_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_messages ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage everything
CREATE POLICY "Superadmins can manage agent_versions" ON agent_versions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage agent_rules" ON agent_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage agent_prompt_sections" ON agent_prompt_sections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage agent_test_sessions" ON agent_test_sessions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage agent_test_messages" ON agent_test_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DO $$
DECLARE
  tables TEXT[] := ARRAY['agent_rules', 'agent_prompt_sections'];
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    FOREACH t IN ARRAY tables LOOP
      EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ', t, t);
    END LOOP;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Triggers already exist, ignore
  NULL;
END $$;

-- ============================================
-- HELPER FUNCTION: Generate Agent SDK Config
-- ============================================
CREATE OR REPLACE FUNCTION generate_agent_sdk_config(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_agent RECORD;
  v_tools JSONB;
  v_skills JSONB;
  v_rules JSONB;
  v_prompt_sections JSONB;
  v_delegations JSONB;
  v_compiled_prompt TEXT;
  v_model_name TEXT;
BEGIN
  -- Get agent details
  SELECT * INTO v_agent FROM ai_agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Map model to SDK model name
  v_model_name := CASE v_agent.model
    WHEN 'sonnet' THEN 'claude-sonnet-4-5-20250929'
    WHEN 'opus' THEN 'claude-opus-4-5-20251101'
    WHEN 'haiku' THEN 'claude-haiku-4-5-20251001'
    ELSE 'claude-sonnet-4-5-20250929'
  END;

  -- Get assigned tools
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', t.name,
    'description', t.description,
    'input_schema', t.input_schema
  )), '[]'::jsonb)
  INTO v_tools
  FROM ai_agent_tools aat
  JOIN agent_tools t ON t.id = aat.tool_id
  WHERE aat.agent_id = p_agent_id AND t.is_enabled = true;

  -- Get assigned skills
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', s.name,
    'description', s.description,
    'content', s.skill_content,
    'triggers', s.triggers
  )), '[]'::jsonb)
  INTO v_skills
  FROM ai_agent_skills aas
  JOIN agent_skills s ON s.id = aas.skill_id
  WHERE aas.agent_id = p_agent_id AND s.is_enabled = true;

  -- Get rules
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', r.rule_type,
    'content', r.rule_content,
    'condition', r.condition,
    'priority', r.priority
  ) ORDER BY r.priority), '[]'::jsonb)
  INTO v_rules
  FROM agent_rules r
  WHERE r.agent_id = p_agent_id AND r.is_enabled = true;

  -- Get prompt sections
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type', ps.section_type,
    'title', ps.section_title,
    'content', ps.section_content,
    'position', ps.position
  ) ORDER BY ps.position), '[]'::jsonb)
  INTO v_prompt_sections
  FROM agent_prompt_sections ps
  WHERE ps.agent_id = p_agent_id AND ps.is_enabled = true;

  -- Get delegations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'toAgent', a.name,
    'toAgentId', d.to_agent_id,
    'condition', d.condition,
    'contextTemplate', d.context_template
  )), '[]'::jsonb)
  INTO v_delegations
  FROM agent_delegations d
  JOIN ai_agents a ON a.id = d.to_agent_id
  WHERE d.from_agent_id = p_agent_id;

  -- Compile system prompt from sections + skills + rules
  -- (This is a simplified version - the full compilation happens in TypeScript)
  v_compiled_prompt := v_agent.system_prompt;

  -- Build final config
  RETURN jsonb_build_object(
    'name', v_agent.name,
    'slug', v_agent.slug,
    'description', v_agent.description,
    'model', v_model_name,
    'systemPrompt', v_compiled_prompt,
    'maxTurns', v_agent.max_turns,
    'permissionMode', v_agent.permission_mode,
    'tools', v_tools,
    'skills', v_skills,
    'rules', v_rules,
    'promptSections', v_prompt_sections,
    'delegations', v_delegations,
    'isHead', v_agent.is_head,
    'departmentId', v_agent.department_id
  );
END;
$$;

-- ============================================
-- FUNCTION: Create Agent Version
-- ============================================
CREATE OR REPLACE FUNCTION create_agent_version(
  p_agent_id UUID,
  p_change_type TEXT,
  p_change_description TEXT DEFAULT NULL,
  p_change_details JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL
)
RETURNS agent_versions
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version INTEGER;
  v_config JSONB;
  v_new_version agent_versions;
BEGIN
  -- Get current version
  SELECT COALESCE(current_version, 0) INTO v_current_version
  FROM ai_agents WHERE id = p_agent_id;

  -- Generate config snapshot
  v_config := generate_agent_sdk_config(p_agent_id);

  -- Increment version
  v_current_version := v_current_version + 1;

  -- Update agent's current version
  UPDATE ai_agents SET current_version = v_current_version WHERE id = p_agent_id;

  -- Insert version record
  INSERT INTO agent_versions (
    agent_id, version, config_snapshot, change_type,
    change_description, change_details, created_by
  )
  VALUES (
    p_agent_id, v_current_version, v_config, p_change_type,
    p_change_description, p_change_details, p_created_by
  )
  RETURNING * INTO v_new_version;

  RETURN v_new_version;
END;
$$;

-- ============================================
-- FUNCTION: Publish Agent Version
-- ============================================
CREATE OR REPLACE FUNCTION publish_agent_version(
  p_agent_id UUID,
  p_version INTEGER,
  p_published_by UUID
)
RETURNS agent_versions
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated agent_versions;
BEGIN
  -- Unpublish any currently published version
  UPDATE agent_versions
  SET is_published = false
  WHERE agent_id = p_agent_id AND is_published = true;

  -- Publish the specified version
  UPDATE agent_versions
  SET is_published = true, published_at = NOW(), published_by = p_published_by
  WHERE agent_id = p_agent_id AND version = p_version
  RETURNING * INTO v_updated;

  -- Update agent's published version
  UPDATE ai_agents
  SET published_version = p_version
  WHERE id = p_agent_id;

  RETURN v_updated;
END;
$$;

-- ============================================
-- SEED PROMPT TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS agent_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  role TEXT NOT NULL,  -- 'sdr', 'account_executive', 'cs_manager', 'ar_clerk', etc.
  department TEXT,
  sections JSONB NOT NULL,  -- Array of {type, title, content}
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_templates_role ON agent_prompt_templates(role);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_templates_department ON agent_prompt_templates(department);

-- Enable RLS
ALTER TABLE agent_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage agent_prompt_templates" ON agent_prompt_templates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- Seed templates
INSERT INTO agent_prompt_templates (name, description, role, department, sections) VALUES
('SDR Agent', 'Sales Development Representative for outbound prospecting', 'sdr', 'sales', '[
  {"type": "identity", "title": "Role", "content": "You are an SDR (Sales Development Representative) agent."},
  {"type": "capabilities", "title": "Responsibilities", "content": "- Research and identify potential prospects\n- Execute outbound email sequences\n- Qualify inbound leads based on ICP criteria\n- Book meetings for Account Executives"},
  {"type": "personality", "title": "Personality", "content": "- Professional but personable\n- Persistent without being pushy\n- Data-driven in your approach"},
  {"type": "constraints", "title": "Constraints", "content": "- Never send more than 5 emails to a prospect without human approval\n- Always personalize first touch based on research\n- If unsure about deal size or terms, consult finance_agent\n- Escalate enterprise prospects (>$100K) to sales_head"}
]'::jsonb),

('Account Executive', 'Closes deals and manages the sales pipeline', 'account_executive', 'sales', '[
  {"type": "identity", "title": "Role", "content": "You are an Account Executive agent responsible for closing deals."},
  {"type": "capabilities", "title": "Responsibilities", "content": "- Manage deals through the sales pipeline\n- Conduct discovery calls and demos\n- Negotiate contracts and pricing\n- Collaborate with legal for contract reviews"},
  {"type": "personality", "title": "Personality", "content": "- Confident and consultative\n- Solution-oriented\n- Builds genuine relationships"},
  {"type": "constraints", "title": "Constraints", "content": "- Discounts over 15% require finance_head approval\n- Custom contract terms require legal_agent review\n- Enterprise deals require CS involvement before close"}
]'::jsonb),

('AR Clerk', 'Manages accounts receivable and collections', 'ar_clerk', 'finance', '[
  {"type": "identity", "title": "Role", "content": "You are an AR (Accounts Receivable) Clerk agent."},
  {"type": "capabilities", "title": "Responsibilities", "content": "- Monitor outstanding invoices\n- Send payment reminders\n- Process incoming payments\n- Handle payment disputes"},
  {"type": "personality", "title": "Personality", "content": "- Professional and courteous\n- Firm but understanding\n- Detail-oriented"},
  {"type": "constraints", "title": "Constraints", "content": "- Escalate invoices over 90 days to finance_head\n- Payment plans require finance_head approval\n- Never threaten legal action without approval"}
]'::jsonb),

('Customer Success Manager', 'Ensures customer satisfaction and retention', 'cs_manager', 'customer_success', '[
  {"type": "identity", "title": "Role", "content": "You are a Customer Success Manager agent."},
  {"type": "capabilities", "title": "Responsibilities", "content": "- Onboard new customers\n- Monitor customer health scores\n- Conduct quarterly business reviews\n- Identify expansion opportunities"},
  {"type": "personality", "title": "Personality", "content": "- Empathetic and supportive\n- Proactive problem solver\n- Excellent communicator"},
  {"type": "constraints", "title": "Constraints", "content": "- Escalate churn risks immediately to cs_head\n- Refunds require finance approval\n- Custom development requests go to product team"}
]'::jsonb)

ON CONFLICT (name) DO NOTHING;
