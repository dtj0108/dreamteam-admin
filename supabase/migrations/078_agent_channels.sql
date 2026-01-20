-- 078_agent_channels.sql
-- Agent Communication via Teams & Channels
-- Enables agent-to-agent communication through dedicated channels

-- ============================================
-- 1. ADD AGENT CHANNEL SUPPORT TO CHANNELS TABLE
-- ============================================
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_agent_channel BOOLEAN DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS linked_agent_id UUID;

-- Index for finding agent channels
CREATE INDEX IF NOT EXISTS idx_channels_is_agent ON channels(is_agent_channel) WHERE is_agent_channel = true;
CREATE INDEX IF NOT EXISTS idx_channels_linked_agent ON channels(linked_agent_id) WHERE linked_agent_id IS NOT NULL;

-- ============================================
-- 2. ADD AGENT PROFILE SUPPORT TO PROFILES TABLE
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_slug VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked_agent_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index for finding agent profiles
CREATE INDEX IF NOT EXISTS idx_profiles_is_agent ON profiles(is_agent) WHERE is_agent = true;
CREATE INDEX IF NOT EXISTS idx_profiles_agent_slug ON profiles(agent_slug) WHERE agent_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_linked_agent ON profiles(linked_agent_id) WHERE linked_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_agent_workspace ON profiles(agent_workspace_id) WHERE agent_workspace_id IS NOT NULL;

-- Unique constraint: one agent profile per agent per workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_agent_workspace_unique
ON profiles(linked_agent_id, agent_workspace_id)
WHERE is_agent = true;

-- ============================================
-- 3. ADD AGENT MESSAGE TRACKING TO MESSAGES TABLE
-- ============================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_agent_request BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS agent_request_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS agent_response_status VARCHAR(50);

-- Index for finding agent requests/responses
CREATE INDEX IF NOT EXISTS idx_messages_agent_request ON messages(is_agent_request) WHERE is_agent_request = true;
CREATE INDEX IF NOT EXISTS idx_messages_agent_request_id ON messages(agent_request_id) WHERE agent_request_id IS NOT NULL;

-- ============================================
-- 4. HELPER FUNCTION: GET AGENT CHANNEL
-- ============================================
CREATE OR REPLACE FUNCTION get_agent_channel(
  p_workspace_id UUID,
  p_agent_slug VARCHAR
)
RETURNS UUID AS $$
DECLARE
  channel_id UUID;
BEGIN
  SELECT c.id INTO channel_id
  FROM channels c
  WHERE c.workspace_id = p_workspace_id
    AND c.is_agent_channel = true
    AND c.name = 'agent-' || p_agent_slug;

  RETURN channel_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. HELPER FUNCTION: GET AGENT PROFILE
-- ============================================
CREATE OR REPLACE FUNCTION get_agent_profile(
  p_workspace_id UUID,
  p_agent_slug VARCHAR
)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT p.id INTO profile_id
  FROM profiles p
  WHERE p.agent_workspace_id = p_workspace_id
    AND p.is_agent = true
    AND p.agent_slug = p_agent_slug;

  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. COMMENTS
-- ============================================
COMMENT ON COLUMN channels.is_agent_channel IS 'True if this channel is dedicated for agent-to-agent communication';
COMMENT ON COLUMN channels.linked_agent_id IS 'The AI agent this channel is linked to (for agent channels)';

COMMENT ON COLUMN profiles.is_agent IS 'True if this profile represents an AI agent (not a human user)';
COMMENT ON COLUMN profiles.agent_slug IS 'Unique slug for the agent within the workspace';
COMMENT ON COLUMN profiles.linked_agent_id IS 'Reference to the ai_agents table for agent profiles';
COMMENT ON COLUMN profiles.agent_workspace_id IS 'The workspace this agent profile belongs to';

COMMENT ON COLUMN messages.is_agent_request IS 'True if this message is a delegation request from head agent to specialist';
COMMENT ON COLUMN messages.agent_request_id IS 'UUID to correlate agent requests with their responses';
COMMENT ON COLUMN messages.agent_response_status IS 'Status of agent response: pending, completed, timeout, error';

COMMENT ON FUNCTION get_agent_channel(UUID, VARCHAR) IS 'Get the channel ID for an agent in a workspace';
COMMENT ON FUNCTION get_agent_profile(UUID, VARCHAR) IS 'Get the profile ID for an agent in a workspace';
