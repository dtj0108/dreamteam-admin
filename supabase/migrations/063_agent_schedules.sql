-- 063_agent_schedules.sql
-- Scheduled & Recurring Agent Tasks

-- ============================================
-- AGENT SCHEDULES
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Schedule timing
  cron_expression TEXT NOT NULL,  -- e.g., "0 0 1 */3 *" for quarterly
  timezone TEXT DEFAULT 'UTC',

  -- Task definition
  task_prompt TEXT NOT NULL,  -- What the agent should do

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,

  -- Output configuration (optional)
  output_config JSONB DEFAULT '{}',

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent ON agent_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_enabled ON agent_schedules(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_run ON agent_schedules(next_run_at) WHERE is_enabled = true;

-- ============================================
-- AGENT SCHEDULE EXECUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS agent_schedule_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES agent_schedules(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'running', 'completed', 'failed', 'cancelled')),

  -- Approval workflow
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Results
  result JSONB,
  tool_calls JSONB,
  error_message TEXT,

  -- Metrics
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 6),
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule ON agent_schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_agent ON agent_schedule_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON agent_schedule_executions(status);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_pending ON agent_schedule_executions(status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_schedule_executions_created ON agent_schedule_executions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedule_executions ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage schedules
CREATE POLICY "Superadmins can manage agent_schedules" ON agent_schedules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage agent_schedule_executions" ON agent_schedule_executions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- TRIGGERS
-- ============================================
-- Update updated_at on schedule changes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_agent_schedules_updated_at
    BEFORE UPDATE ON agent_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- HELPER FUNCTION: Calculate next run time from cron expression
-- ============================================
-- Note: Full cron parsing is complex; this is handled in application code
-- This function just updates the next_run_at after execution
CREATE OR REPLACE FUNCTION update_schedule_after_execution(p_schedule_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE agent_schedules
  SET last_run_at = NOW()
  WHERE id = p_schedule_id;
END;
$$;
