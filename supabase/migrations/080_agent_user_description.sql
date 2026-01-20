-- Add user-facing description field to agents
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS user_description TEXT;

-- Add comment for clarity
COMMENT ON COLUMN ai_agents.user_description IS 'User-facing description shown in mobile/web apps';
