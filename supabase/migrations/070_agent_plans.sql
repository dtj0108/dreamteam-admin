-- 070_agent_plans.sql
-- Add plan assignment to agents

-- Add plan_id column to ai_agents
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Add index for plan queries
CREATE INDEX IF NOT EXISTS idx_ai_agents_plan ON ai_agents(plan_id);

-- Comment explaining valid plan values
COMMENT ON COLUMN ai_agents.plan_id IS 'Subscription plan this agent belongs to (e.g., starter, pro, enterprise). NULL means available to all plans.';
