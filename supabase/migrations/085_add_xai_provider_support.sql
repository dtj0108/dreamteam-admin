-- Migration: Add xAI Grok provider support
-- This migration adds multi-provider support to the AI agents system

-- Add provider column with backward-compatible default
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'anthropic'
CHECK (provider IN ('anthropic', 'xai'));

-- Add provider-specific config column (for reasoning effort, etc.)
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';

-- Update the model constraint to include xAI models
-- First, drop existing constraint if it exists
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_model_check;

-- Add new constraint with all valid models
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_model_check
CHECK (model IN (
  'sonnet', 'opus', 'haiku',
  'grok-4-fast', 'grok-3', 'grok-3-mini', 'grok-2'
));

-- Ensure model matches provider with a check constraint
-- This ensures anthropic agents use claude models and xai agents use grok models
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_provider_model_match CHECK (
  (provider = 'anthropic' AND model IN ('sonnet', 'opus', 'haiku'))
  OR
  (provider = 'xai' AND model IN ('grok-4-fast', 'grok-3', 'grok-3-mini', 'grok-2'))
);

-- Update agent_departments to support default provider
ALTER TABLE agent_departments
ADD COLUMN IF NOT EXISTS default_provider TEXT DEFAULT 'anthropic'
CHECK (default_provider IN ('anthropic', 'xai'));

-- Update the default model constraint for departments
ALTER TABLE agent_departments DROP CONSTRAINT IF EXISTS agent_departments_default_model_check;
ALTER TABLE agent_departments ADD CONSTRAINT agent_departments_default_model_check
CHECK (default_model IN (
  'sonnet', 'opus', 'haiku',
  'grok-4-fast', 'grok-3', 'grok-3-mini', 'grok-2'
));

-- Add index for provider column (useful for filtering agents by provider)
CREATE INDEX IF NOT EXISTS idx_ai_agents_provider ON ai_agents(provider);

-- Comment on new columns
COMMENT ON COLUMN ai_agents.provider IS 'AI provider: anthropic (Claude) or xai (Grok)';
COMMENT ON COLUMN ai_agents.provider_config IS 'Provider-specific configuration (e.g., reasoning_effort for xAI)';
COMMENT ON COLUMN agent_departments.default_provider IS 'Default AI provider for agents in this department';
