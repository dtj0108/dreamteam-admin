-- Migration: Add multi-provider support to AI agents
-- Supports: Anthropic (Claude), OpenAI (GPT), xAI (Grok), Google (Gemini), etc.

-- Add provider column with backward-compatible default (no strict constraint - allow any provider)
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'anthropic';

-- Add provider-specific config column (for reasoning effort, etc.)
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';

-- Drop existing model constraints to allow any model name
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_model_check;
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_provider_model_match;

-- Update agent_departments to support default provider (no strict constraint)
ALTER TABLE agent_departments
ADD COLUMN IF NOT EXISTS default_provider TEXT DEFAULT 'anthropic';

-- Drop existing department model constraints
ALTER TABLE agent_departments DROP CONSTRAINT IF EXISTS agent_departments_default_model_check;

-- Add index for provider column (useful for filtering agents by provider)
CREATE INDEX IF NOT EXISTS idx_ai_agents_provider ON ai_agents(provider);

-- Comment on new columns
COMMENT ON COLUMN ai_agents.provider IS 'AI provider: anthropic (Claude) or xai (Grok)';
COMMENT ON COLUMN ai_agents.provider_config IS 'Provider-specific configuration (e.g., reasoning_effort for xAI)';
COMMENT ON COLUMN agent_departments.default_provider IS 'Default AI provider for agents in this department';
