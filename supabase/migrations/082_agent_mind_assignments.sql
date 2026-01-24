-- 082_agent_mind_assignments.sql
-- Create junction table for agent-to-mind assignments

CREATE TABLE IF NOT EXISTS agent_mind_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  mind_id UUID NOT NULL REFERENCES agent_mind(id) ON DELETE CASCADE,
  position_override INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, mind_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_mind_assignments_agent ON agent_mind_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mind_assignments_mind ON agent_mind_assignments(mind_id);

-- Enable RLS
ALTER TABLE agent_mind_assignments ENABLE ROW LEVEL SECURITY;

-- Allow read access (adjust policy as needed)
CREATE POLICY "Allow read access to agent_mind_assignments"
ON agent_mind_assignments FOR SELECT
USING (true);
