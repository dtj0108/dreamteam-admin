-- 059_workspace_features.sql
-- Add workspace suspension and feature flags support

-- 1. Add suspension fields to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Index for finding suspended workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_suspended
ON workspaces(is_suspended) WHERE is_suspended = true;

-- 2. Create workspace feature flags table
CREATE TABLE IF NOT EXISTS workspace_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_workspace_feature_flags_workspace
ON workspace_feature_flags(workspace_id);

-- RLS for workspace feature flags
ALTER TABLE workspace_feature_flags ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all workspace feature flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_feature_flags'
    AND policyname = 'Superadmins can manage workspace feature flags'
  ) THEN
    CREATE POLICY "Superadmins can manage workspace feature flags"
    ON workspace_feature_flags FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_superadmin = true
      )
    );
  END IF;
END $$;

-- Workspace members can read their workspace's feature flags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspace_feature_flags'
    AND policyname = 'Workspace members can read feature flags'
  ) THEN
    CREATE POLICY "Workspace members can read feature flags"
    ON workspace_feature_flags FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = workspace_feature_flags.workspace_id
        AND profile_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Updated_at trigger for workspace_feature_flags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_workspace_feature_flags_updated_at'
    ) THEN
      CREATE TRIGGER update_workspace_feature_flags_updated_at
        BEFORE UPDATE ON workspace_feature_flags
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
