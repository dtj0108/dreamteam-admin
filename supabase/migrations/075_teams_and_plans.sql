-- 075_teams_and_plans.sql
-- Team Builder: Teams and Plans tables

-- ============================================
-- 1. TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  head_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. TEAM AGENTS (membership junction table)
-- ============================================
CREATE TABLE IF NOT EXISTS team_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'head', 'member'
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, agent_id)
);

-- ============================================
-- 3. TEAM DELEGATIONS (team-level delegation overrides)
-- ============================================
CREATE TABLE IF NOT EXISTS team_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  condition TEXT,
  context_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT team_no_self_delegation CHECK (from_agent_id != to_agent_id)
);

-- ============================================
-- 4. UPDATE PLANS TABLE (add missing columns if table exists)
-- ============================================
DO $$
BEGIN
  -- Add team_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'team_id') THEN
    ALTER TABLE plans ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
  END IF;

  -- Add price_yearly column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_yearly') THEN
    ALTER TABLE plans ADD COLUMN price_yearly INT;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'is_active') THEN
    ALTER TABLE plans ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add features column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'features') THEN
    ALTER TABLE plans ADD COLUMN features JSONB DEFAULT '[]';
  END IF;

  -- Add limits column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'limits') THEN
    ALTER TABLE plans ADD COLUMN limits JSONB DEFAULT '{}';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'updated_at') THEN
    ALTER TABLE plans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_agents_team ON team_agents(team_id);
CREATE INDEX IF NOT EXISTS idx_team_agents_agent ON team_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_team_delegations_team ON team_delegations(team_id);
CREATE INDEX IF NOT EXISTS idx_plans_team ON plans(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

-- ============================================
-- 6. TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. SEED DATA - Default Teams
-- ============================================
-- Starter Team (basic)
INSERT INTO teams (name, slug, description, is_active) VALUES
  ('Starter Team', 'starter', 'Core team for Starter plan with essential agents', true)
ON CONFLICT (slug) DO NOTHING;

-- Growth Team (expanded)
INSERT INTO teams (name, slug, description, is_active) VALUES
  ('Growth Team', 'growth', 'Expanded team for Growth plan with additional specialists', true)
ON CONFLICT (slug) DO NOTHING;

-- Scale Team (full)
INSERT INTO teams (name, slug, description, is_active) VALUES
  ('Scale Team', 'scale', 'Full team with Co-Founder coordinator for Scale plan', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 8. COMMENTS
-- ============================================
COMMENT ON TABLE teams IS 'Team definitions for grouping agents into subscription plans';
COMMENT ON TABLE team_agents IS 'Junction table linking agents to teams with roles';
COMMENT ON TABLE team_delegations IS 'Team-level delegation rules between agents within a team';
COMMENT ON COLUMN teams.head_agent_id IS 'The lead/coordinator agent for this team';
COMMENT ON COLUMN team_agents.role IS 'Role within team: head or member';
COMMENT ON COLUMN team_agents.display_order IS 'Display order for UI presentation';
COMMENT ON COLUMN plans.team_id IS 'The team of agents available in this plan';
