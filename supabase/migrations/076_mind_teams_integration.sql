-- Migration: Mind Teams Integration
-- Add team_id column to agent_mind and create team_mind junction table

-- Add team_id column to agent_mind
ALTER TABLE agent_mind
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agent_mind_team ON agent_mind(team_id);

-- Junction table for team-mind assignments
-- This allows a team to have multiple mind files assigned
CREATE TABLE IF NOT EXISTS team_mind (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  mind_id UUID NOT NULL REFERENCES agent_mind(id) ON DELETE CASCADE,
  position_override INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, mind_id)
);

CREATE INDEX IF NOT EXISTS idx_team_mind_team ON team_mind(team_id);
CREATE INDEX IF NOT EXISTS idx_team_mind_mind ON team_mind(mind_id);
