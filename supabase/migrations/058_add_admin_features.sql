-- 058_add_admin_features.sql
-- Add admin panel features to existing database

-- 1. Add is_superadmin column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Index for superadmin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_superadmin
ON profiles(is_superadmin) WHERE is_superadmin = true;

-- 2. Create admin-specific audit logs (separate from general audit_logs)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- RLS: Only superadmins can view
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Superadmins can view admin audit logs'
  ) THEN
    CREATE POLICY "Superadmins can view admin audit logs"
    ON admin_audit_logs FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_superadmin = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'System can insert admin audit logs'
  ) THEN
    CREATE POLICY "System can insert admin audit logs"
    ON admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Create global feature flags table
CREATE TABLE IF NOT EXISTS global_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default flags
INSERT INTO global_feature_flags (feature_key, is_enabled, description) VALUES
  ('maintenance_mode', false, 'Put the entire platform in maintenance mode'),
  ('new_user_registration', true, 'Allow new user registrations'),
  ('api_access_global', true, 'Enable API access platform-wide'),
  ('ai_features', true, 'Enable AI-powered features')
ON CONFLICT (feature_key) DO NOTHING;

-- RLS for feature flags
ALTER TABLE global_feature_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'global_feature_flags' AND policyname = 'Anyone authenticated can read feature flags'
  ) THEN
    CREATE POLICY "Anyone authenticated can read feature flags"
    ON global_feature_flags FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'global_feature_flags' AND policyname = 'Superadmins can update feature flags'
  ) THEN
    CREATE POLICY "Superadmins can update feature flags"
    ON global_feature_flags FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_superadmin = true
      )
    );
  END IF;
END $$;

-- Updated_at trigger for feature flags (only if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_global_feature_flags_updated_at'
    ) THEN
      CREATE TRIGGER update_global_feature_flags_updated_at
        BEFORE UPDATE ON global_feature_flags
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
