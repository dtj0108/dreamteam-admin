-- Model Provider Configurations
-- Stores API keys and settings for AI providers (Anthropic, xAI)

CREATE TABLE model_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('anthropic', 'xai')),
  api_key_encrypted TEXT,  -- Encrypted with AES-256-GCM
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with providers (no keys yet)
INSERT INTO model_provider_configs (provider, is_enabled)
VALUES ('anthropic', false), ('xai', false)
ON CONFLICT (provider) DO NOTHING;

-- RLS
ALTER TABLE model_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage provider configs"
ON model_provider_configs FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
);

-- Update trigger for updated_at
CREATE TRIGGER update_model_provider_configs_updated_at
  BEFORE UPDATE ON model_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
