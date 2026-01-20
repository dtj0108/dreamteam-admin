-- 077_workspace_deployed_teams.sql
-- Deployed Instance Model: Separates team templates from per-workspace deployments

-- ============================================
-- 1. ADD VERSION TRACKING TO TEAMS
-- ============================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Trigger to auto-increment version on team changes
CREATE OR REPLACE FUNCTION increment_team_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_version := COALESCE(OLD.current_version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if not exists
DROP TRIGGER IF EXISTS team_version_trigger ON teams;
CREATE TRIGGER team_version_trigger
BEFORE UPDATE ON teams
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION increment_team_version();

-- ============================================
-- 2. ADD PLAN_ID TO WORKSPACES (for auto-deploy)
-- ============================================
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_plan ON workspaces(plan_id);

-- ============================================
-- 3. CREATE WORKSPACE_DEPLOYED_TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_deployed_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  source_version INTEGER NOT NULL,  -- Version of template when deployed

  -- Base configuration (from template at deploy time)
  -- Contains: team info, agents, delegations, team_mind
  base_config JSONB NOT NULL,

  -- Workspace customizations (merged on top of base_config at runtime)
  -- Structure: { disabled_agents: [], disabled_delegations: [], added_mind: [], agent_overrides: {} }
  customizations JSONB DEFAULT '{}',

  -- Computed active config (base_config + customizations, updated on save)
  active_config JSONB NOT NULL,

  deployed_at TIMESTAMPTZ DEFAULT now(),
  deployed_by UUID REFERENCES profiles(id),
  last_customized_at TIMESTAMPTZ,
  last_customized_by UUID REFERENCES profiles(id),

  -- Status: active = in use, paused = temporarily disabled, replaced = superseded by new deployment
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'replaced', 'failed')),

  -- For rollback capability - points to the deployment this replaced
  previous_deployment_id UUID REFERENCES workspace_deployed_teams(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_deployed_teams_workspace ON workspace_deployed_teams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_deployed_teams_source ON workspace_deployed_teams(source_team_id);
CREATE INDEX IF NOT EXISTS idx_deployed_teams_status ON workspace_deployed_teams(status);
CREATE INDEX IF NOT EXISTS idx_deployed_teams_workspace_active ON workspace_deployed_teams(workspace_id) WHERE status = 'active';

-- Unique partial index: only one active deployment per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_deployed_teams_workspace_active_unique
ON workspace_deployed_teams(workspace_id)
WHERE status = 'active';

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS update_workspace_deployed_teams_updated_at ON workspace_deployed_teams;
CREATE TRIGGER update_workspace_deployed_teams_updated_at
  BEFORE UPDATE ON workspace_deployed_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE workspace_deployed_teams ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all deployments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_deployed_teams'
    AND policyname = 'Superadmins can manage all deployments'
  ) THEN
    CREATE POLICY "Superadmins can manage all deployments"
    ON workspace_deployed_teams FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_superadmin = true
      )
    );
  END IF;
END $$;

-- Workspace owners can read their deployment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_deployed_teams'
    AND policyname = 'Workspace owners can read their deployment'
  ) THEN
    CREATE POLICY "Workspace owners can read their deployment"
    ON workspace_deployed_teams FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_deployed_teams.workspace_id
        AND profile_id = auth.uid()
        AND role = 'owner'
      )
    );
  END IF;
END $$;

-- Service role for Railway can read all active deployments
-- (This is handled by using the service role key, not RLS)

-- ============================================
-- 7. COMMENTS
-- ============================================
COMMENT ON TABLE workspace_deployed_teams IS 'Per-workspace deployment of team templates with customization support';
COMMENT ON COLUMN workspace_deployed_teams.source_team_id IS 'Reference to the team template this was deployed from';
COMMENT ON COLUMN workspace_deployed_teams.source_version IS 'Version of the team template at time of deployment';
COMMENT ON COLUMN workspace_deployed_teams.base_config IS 'Snapshot of team config at deployment time (agents, delegations, mind)';
COMMENT ON COLUMN workspace_deployed_teams.customizations IS 'Workspace-specific overrides (disabled agents, added mind, etc)';
COMMENT ON COLUMN workspace_deployed_teams.active_config IS 'Computed config = base_config + customizations, used by runtime';
COMMENT ON COLUMN workspace_deployed_teams.status IS 'active=in use, paused=disabled, replaced=superseded, failed=deployment error';
COMMENT ON COLUMN workspace_deployed_teams.previous_deployment_id IS 'Previous deployment for rollback support';
