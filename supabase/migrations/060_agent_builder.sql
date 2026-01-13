-- 060_agent_builder.sql
-- Agent Builder MVP schema

-- ============================================
-- DROP EXISTING TABLES (clean slate for agent builder)
-- ============================================
DROP TABLE IF EXISTS agent_delegations CASCADE;
DROP TABLE IF EXISTS ai_agent_skills CASCADE;
DROP TABLE IF EXISTS ai_agent_mcp_integrations CASCADE;
DROP TABLE IF EXISTS ai_agent_tools CASCADE;
DROP TABLE IF EXISTS agent_tool_assignments CASCADE;
DROP TABLE IF EXISTS agent_skill_assignments CASCADE;
DROP TABLE IF EXISTS agent_mcp_assignments CASCADE;
DROP TABLE IF EXISTS ai_agents CASCADE;
DROP TABLE IF EXISTS agent_skills CASCADE;
DROP TABLE IF EXISTS agent_tools CASCADE;
DROP TABLE IF EXISTS mcp_integrations CASCADE;
DROP TABLE IF EXISTS agent_departments CASCADE;

-- ============================================
-- DEPARTMENTS (organizational units for agents)
-- ============================================
CREATE TABLE agent_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'building-2',
  default_model TEXT DEFAULT 'sonnet' CHECK (default_model IN ('sonnet', 'opus', 'haiku')),
  head_agent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_departments_name ON agent_departments(name);

-- ============================================
-- MCP INTEGRATIONS (external tool connections)
-- ============================================
CREATE TABLE mcp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('stdio', 'sse', 'http')),
  config JSONB DEFAULT '{}',
  auth_type TEXT DEFAULT 'none' CHECK (auth_type IN ('none', 'api_key', 'oauth', 'basic')),
  auth_config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_integrations_type ON mcp_integrations(type);
CREATE INDEX IF NOT EXISTS idx_mcp_integrations_enabled ON mcp_integrations(is_enabled) WHERE is_enabled = true;

-- ============================================
-- TOOLS REGISTRY (DreamTeam MCP tools by department)
-- ============================================
CREATE TABLE agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT DEFAULT 'agents' CHECK (category IN ('finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'agents')),
  input_schema JSONB DEFAULT '{}',
  is_builtin BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_category ON agent_tools(category);
CREATE INDEX IF NOT EXISTS idx_agent_tools_builtin ON agent_tools(is_builtin);

-- ============================================
-- SKILLS LIBRARY
-- ============================================
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES agent_departments(id) ON DELETE SET NULL,
  skill_content TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_skills_department ON agent_skills(department_id);

-- ============================================
-- AGENTS
-- ============================================
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES agent_departments(id) ON DELETE SET NULL,
  avatar_url TEXT,
  model TEXT DEFAULT 'sonnet' CHECK (model IN ('sonnet', 'opus', 'haiku')),
  system_prompt TEXT NOT NULL,
  permission_mode TEXT DEFAULT 'default' CHECK (permission_mode IN ('default', 'acceptEdits', 'bypassPermissions')),
  max_turns INTEGER DEFAULT 10,
  is_enabled BOOLEAN DEFAULT true,
  is_head BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_department ON ai_agents(department_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_enabled ON ai_agents(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_agents_head ON ai_agents(is_head) WHERE is_head = true;

-- Add FK for department head after agents table exists
ALTER TABLE agent_departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY (head_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL;

-- ============================================
-- AGENT-TOOL ASSIGNMENTS
-- ============================================
CREATE TABLE ai_agent_tools (
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
  config JSONB DEFAULT '{}',
  PRIMARY KEY (agent_id, tool_id)
);

-- ============================================
-- AGENT-MCP ASSIGNMENTS
-- ============================================
CREATE TABLE ai_agent_mcp_integrations (
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  mcp_integration_id UUID NOT NULL REFERENCES mcp_integrations(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, mcp_integration_id)
);

-- ============================================
-- AGENT-SKILL ASSIGNMENTS
-- ============================================
CREATE TABLE ai_agent_skills (
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, skill_id)
);

-- ============================================
-- AGENT DELEGATION RULES
-- ============================================
CREATE TABLE agent_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  to_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  condition TEXT,
  context_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_delegation CHECK (from_agent_id != to_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_from ON agent_delegations(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_to ON agent_delegations(to_agent_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agent_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_mcp_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_delegations ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage everything
DO $$
DECLARE
  tables TEXT[] := ARRAY['agent_departments', 'mcp_integrations', 'agent_tools', 'agent_skills', 'ai_agents', 'ai_agent_tools', 'ai_agent_mcp_integrations', 'ai_agent_skills', 'agent_delegations'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE POLICY "Superadmins can manage %I" ON %I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true))
    ', t, t);
  END LOOP;
END $$;

-- ============================================
-- SEED DREAMTEAM MCP TOOLS (291 tools across 8 departments)
-- ============================================

-- FINANCE DEPARTMENT (62 tools)
-- Accounts (8 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('account_list', 'List all accounts', 'finance', '{"workspace_id": {"type": "string", "required": true}, "type": {"type": "string"}, "is_active": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('account_get', 'Get single account', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}}', true, true),
('account_create', 'Create account', 'finance', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "type": {"type": "string", "required": true}, "balance": {"type": "number"}, "institution": {"type": "string"}, "currency": {"type": "string"}}', true, true),
('account_update', 'Update account', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}, "name": {"type": "string"}, "type": {"type": "string"}, "institution": {"type": "string"}, "is_active": {"type": "boolean"}}', true, true),
('account_delete', 'Delete account', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}}', true, true),
('account_get_balance', 'Get current balance', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}}', true, true),
('account_list_by_type', 'Filter by type', 'finance', '{"workspace_id": {"type": "string", "required": true}, "type": {"type": "string", "required": true}}', true, true),
('account_get_totals', 'Total balances', 'finance', '{"workspace_id": {"type": "string", "required": true}, "group_by": {"type": "string"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Transactions (12 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('transaction_list', 'List with filters', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string"}, "category_id": {"type": "string"}, "start_date": {"type": "string"}, "end_date": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}, "type": {"type": "string"}}', true, true),
('transaction_get', 'Get single transaction', 'finance', '{"workspace_id": {"type": "string", "required": true}, "transaction_id": {"type": "string", "required": true}}', true, true),
('transaction_create', 'Create transaction', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}, "amount": {"type": "number", "required": true}, "date": {"type": "string", "required": true}, "description": {"type": "string"}, "category_id": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('transaction_update', 'Update transaction', 'finance', '{"workspace_id": {"type": "string", "required": true}, "transaction_id": {"type": "string", "required": true}, "amount": {"type": "number"}, "date": {"type": "string"}, "description": {"type": "string"}, "category_id": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('transaction_delete', 'Delete transaction', 'finance', '{"workspace_id": {"type": "string", "required": true}, "transaction_id": {"type": "string", "required": true}}', true, true),
('transaction_create_transfer', 'Transfer between accounts', 'finance', '{"workspace_id": {"type": "string", "required": true}, "from_account_id": {"type": "string", "required": true}, "to_account_id": {"type": "string", "required": true}, "amount": {"type": "number", "required": true}, "date": {"type": "string", "required": true}, "description": {"type": "string"}}', true, true),
('transaction_bulk_categorize', 'Categorize multiple transactions', 'finance', '{"workspace_id": {"type": "string", "required": true}, "transaction_ids": {"type": "array", "required": true}, "category_id": {"type": "string", "required": true}}', true, true),
('transaction_search', 'Search by description', 'finance', '{"workspace_id": {"type": "string", "required": true}, "query": {"type": "string", "required": true}, "limit": {"type": "integer"}}', true, true),
('transaction_get_by_date_range', 'Date range filter', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}, "account_id": {"type": "string"}}', true, true),
('transaction_get_uncategorized', 'Get uncategorized transactions', 'finance', '{"workspace_id": {"type": "string", "required": true}, "limit": {"type": "integer"}}', true, true),
('transaction_get_recent', 'Most recent transactions', 'finance', '{"workspace_id": {"type": "string", "required": true}, "limit": {"type": "integer"}}', true, true),
('transaction_get_duplicates', 'Find potential duplicates', 'finance', '{"workspace_id": {"type": "string", "required": true}, "days_window": {"type": "integer"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Categories (7 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('category_list', 'List all categories', 'finance', '{"workspace_id": {"type": "string", "required": true}, "type": {"type": "string"}, "include_system": {"type": "boolean"}}', true, true),
('category_get', 'Get single category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true),
('category_create', 'Create custom category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "type": {"type": "string", "required": true}, "icon": {"type": "string"}, "color": {"type": "string"}, "parent_id": {"type": "string"}}', true, true),
('category_update', 'Update category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}, "name": {"type": "string"}, "icon": {"type": "string"}, "color": {"type": "string"}}', true, true),
('category_delete', 'Delete custom category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true),
('category_get_spending', 'Total spending for category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}, "start_date": {"type": "string"}, "end_date": {"type": "string"}}', true, true),
('category_list_with_totals', 'List with spending totals', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string"}, "end_date": {"type": "string"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Budgets (11 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('budget_list', 'List all budgets', 'finance', '{"workspace_id": {"type": "string", "required": true}, "is_active": {"type": "boolean"}}', true, true),
('budget_get', 'Get budget with spending', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}}', true, true),
('budget_create', 'Create budget', 'finance', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}, "amount": {"type": "number", "required": true}, "period": {"type": "string", "required": true}, "start_date": {"type": "string"}, "rollover": {"type": "boolean"}}', true, true),
('budget_update', 'Update budget', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}, "amount": {"type": "number"}, "period": {"type": "string"}, "rollover": {"type": "boolean"}, "is_active": {"type": "boolean"}}', true, true),
('budget_delete', 'Delete budget', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}}', true, true),
('budget_get_status', 'Budget status (on track, over)', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}}', true, true),
('budget_list_over_limit', 'List budgets over limit', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('budget_list_with_spending', 'List with current spending', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('budget_add_alert', 'Add threshold alert', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}, "threshold_percent": {"type": "number", "required": true}}', true, true),
('budget_remove_alert', 'Remove alert', 'finance', '{"workspace_id": {"type": "string", "required": true}, "budget_id": {"type": "string", "required": true}, "threshold_percent": {"type": "number", "required": true}}', true, true),
('budget_get_alerts_triggered', 'All triggered alerts', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Subscriptions (9 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('subscription_list', 'List all subscriptions', 'finance', '{"workspace_id": {"type": "string", "required": true}, "is_active": {"type": "boolean"}}', true, true),
('subscription_get', 'Get single subscription', 'finance', '{"workspace_id": {"type": "string", "required": true}, "subscription_id": {"type": "string", "required": true}}', true, true),
('subscription_create', 'Create subscription', 'finance', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "amount": {"type": "number", "required": true}, "frequency": {"type": "string", "required": true}, "next_renewal_date": {"type": "string", "required": true}, "category_id": {"type": "string"}, "reminder_days_before": {"type": "integer"}}', true, true),
('subscription_update', 'Update subscription', 'finance', '{"workspace_id": {"type": "string", "required": true}, "subscription_id": {"type": "string", "required": true}, "name": {"type": "string"}, "amount": {"type": "number"}, "frequency": {"type": "string"}, "next_renewal_date": {"type": "string"}, "is_active": {"type": "boolean"}}', true, true),
('subscription_delete', 'Delete subscription', 'finance', '{"workspace_id": {"type": "string", "required": true}, "subscription_id": {"type": "string", "required": true}}', true, true),
('subscription_get_upcoming', 'Subscriptions renewing soon', 'finance', '{"workspace_id": {"type": "string", "required": true}, "days_ahead": {"type": "integer"}}', true, true),
('subscription_get_summary', 'Subscription totals', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('subscription_detect_from_transactions', 'Auto-detect from patterns', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('subscription_mark_canceled', 'Mark subscription canceled', 'finance', '{"workspace_id": {"type": "string", "required": true}, "subscription_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Recurring Rules (7 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('recurring_rule_list', 'List all recurring rules', 'finance', '{"workspace_id": {"type": "string", "required": true}, "is_active": {"type": "boolean"}}', true, true),
('recurring_rule_get', 'Get single rule', 'finance', '{"workspace_id": {"type": "string", "required": true}, "rule_id": {"type": "string", "required": true}}', true, true),
('recurring_rule_create', 'Create recurring rule', 'finance', '{"workspace_id": {"type": "string", "required": true}, "account_id": {"type": "string", "required": true}, "amount": {"type": "number", "required": true}, "description": {"type": "string", "required": true}, "frequency": {"type": "string", "required": true}, "next_date": {"type": "string", "required": true}, "category_id": {"type": "string"}, "end_date": {"type": "string"}}', true, true),
('recurring_rule_update', 'Update rule', 'finance', '{"workspace_id": {"type": "string", "required": true}, "rule_id": {"type": "string", "required": true}, "amount": {"type": "number"}, "frequency": {"type": "string"}, "next_date": {"type": "string"}, "is_active": {"type": "boolean"}}', true, true),
('recurring_rule_delete', 'Delete rule', 'finance', '{"workspace_id": {"type": "string", "required": true}, "rule_id": {"type": "string", "required": true}}', true, true),
('recurring_rule_skip_next', 'Skip next occurrence', 'finance', '{"workspace_id": {"type": "string", "required": true}, "rule_id": {"type": "string", "required": true}}', true, true),
('recurring_rule_generate_transactions', 'Generate pending transactions', 'finance', '{"workspace_id": {"type": "string", "required": true}, "up_to_date": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Analytics (8 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('analytics_get_income_vs_expense', 'Income vs expense comparison', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}, "group_by": {"type": "string"}}', true, true),
('analytics_get_spending_by_category', 'Spending breakdown by category', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}, "limit": {"type": "integer"}}', true, true),
('analytics_get_net_worth', 'Total net worth calculation', 'finance', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('analytics_get_cash_flow', 'Cash flow analysis', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}}', true, true),
('analytics_get_trends', 'Spending/income trends', 'finance', '{"workspace_id": {"type": "string", "required": true}, "months": {"type": "integer"}}', true, true),
('analytics_get_profit_loss', 'Profit & loss statement', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}}', true, true),
('analytics_project_cash_flow', 'Project future cash flow', 'finance', '{"workspace_id": {"type": "string", "required": true}, "months_ahead": {"type": "integer", "required": true}}', true, true),
('analytics_get_calendar_events', 'Financial calendar events', 'finance', '{"workspace_id": {"type": "string", "required": true}, "start_date": {"type": "string", "required": true}, "end_date": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- CRM DEPARTMENT (53 tools)
-- Contacts (10 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('contact_list', 'List all contacts', 'crm', '{"workspace_id": {"type": "string", "required": true}, "search": {"type": "string"}, "tags": {"type": "array"}, "source": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('contact_get', 'Get single contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}}', true, true),
('contact_create', 'Create contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "first_name": {"type": "string", "required": true}, "last_name": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}, "company": {"type": "string"}, "job_title": {"type": "string"}, "tags": {"type": "array"}, "source": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('contact_update', 'Update contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}, "first_name": {"type": "string"}, "last_name": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}, "company": {"type": "string"}, "job_title": {"type": "string"}, "tags": {"type": "array"}, "notes": {"type": "string"}}', true, true),
('contact_delete', 'Delete contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}}', true, true),
('contact_search', 'Search contacts', 'crm', '{"workspace_id": {"type": "string", "required": true}, "query": {"type": "string", "required": true}}', true, true),
('contact_add_tag', 'Add tag to contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}, "tag": {"type": "string", "required": true}}', true, true),
('contact_remove_tag', 'Remove tag from contact', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}, "tag": {"type": "string", "required": true}}', true, true),
('contact_get_activities', 'Get all contact activities', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}}', true, true),
('contact_get_deals', 'Get all contact deals', 'crm', '{"workspace_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Leads (12 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('lead_list', 'List all leads', 'crm', '{"workspace_id": {"type": "string", "required": true}, "status": {"type": "string"}, "pipeline_id": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('lead_get', 'Get lead with details', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}}', true, true),
('lead_create', 'Create lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "website": {"type": "string"}, "industry": {"type": "string"}, "status": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('lead_update', 'Update lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "name": {"type": "string"}, "website": {"type": "string"}, "industry": {"type": "string"}, "status": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('lead_delete', 'Delete lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}}', true, true),
('lead_change_status', 'Change lead status', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "status_id": {"type": "string", "required": true}}', true, true),
('lead_add_contact', 'Add contact to lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "contact_id": {"type": "string", "required": true}}', true, true),
('lead_add_task', 'Add task to lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "title": {"type": "string", "required": true}, "due_date": {"type": "string"}, "assignee_id": {"type": "string"}}', true, true),
('lead_complete_task', 'Complete lead task', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('lead_add_opportunity', 'Create opportunity from lead', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}, "deal_data": {"type": "object", "required": true}}', true, true),
('lead_get_tasks', 'Get lead tasks', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}}', true, true),
('lead_get_opportunities', 'Get lead opportunities', 'crm', '{"workspace_id": {"type": "string", "required": true}, "lead_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Pipelines (9 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('pipeline_list', 'List all pipelines', 'crm', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('pipeline_get', 'Get pipeline with stages', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}}', true, true),
('pipeline_create', 'Create pipeline', 'crm', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "description": {"type": "string"}}', true, true),
('pipeline_update', 'Update pipeline', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "is_default": {"type": "boolean"}}', true, true),
('pipeline_delete', 'Delete pipeline', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}}', true, true),
('pipeline_add_stage', 'Add stage to pipeline', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "color": {"type": "string"}, "win_probability": {"type": "number"}, "position": {"type": "integer"}}', true, true),
('pipeline_update_stage', 'Update pipeline stage', 'crm', '{"workspace_id": {"type": "string", "required": true}, "stage_id": {"type": "string", "required": true}, "name": {"type": "string"}, "color": {"type": "string"}, "win_probability": {"type": "number"}, "position": {"type": "integer"}}', true, true),
('pipeline_delete_stage', 'Delete pipeline stage', 'crm', '{"workspace_id": {"type": "string", "required": true}, "stage_id": {"type": "string", "required": true}}', true, true),
('pipeline_reorder_stages', 'Reorder pipeline stages', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}, "stage_ids": {"type": "array", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Deals (11 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('deal_list', 'List all deals', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string"}, "stage_id": {"type": "string"}, "status": {"type": "string"}, "contact_id": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('deal_get', 'Get single deal', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}}', true, true),
('deal_create', 'Create deal', 'crm', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "value": {"type": "number", "required": true}, "pipeline_id": {"type": "string", "required": true}, "stage_id": {"type": "string", "required": true}, "contact_id": {"type": "string"}, "expected_close_date": {"type": "string"}, "probability": {"type": "number"}, "notes": {"type": "string"}}', true, true),
('deal_update', 'Update deal', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}, "name": {"type": "string"}, "value": {"type": "number"}, "stage_id": {"type": "string"}, "expected_close_date": {"type": "string"}, "probability": {"type": "number"}, "notes": {"type": "string"}}', true, true),
('deal_delete', 'Delete deal', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}}', true, true),
('deal_move_stage', 'Move deal to stage', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}, "stage_id": {"type": "string", "required": true}}', true, true),
('deal_mark_won', 'Mark deal as won', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}, "actual_close_date": {"type": "string"}}', true, true),
('deal_mark_lost', 'Mark deal as lost', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}, "reason": {"type": "string"}}', true, true),
('deal_get_activities', 'Get deal activities', 'crm', '{"workspace_id": {"type": "string", "required": true}, "deal_id": {"type": "string", "required": true}}', true, true),
('deal_get_value_by_stage', 'Get value by stage', 'crm', '{"workspace_id": {"type": "string", "required": true}, "pipeline_id": {"type": "string", "required": true}}', true, true),
('deal_get_forecast', 'Get sales forecast', 'crm', '{"workspace_id": {"type": "string", "required": true}, "months_ahead": {"type": "integer"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Activities (11 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('activity_list', 'List all activities', 'crm', '{"workspace_id": {"type": "string", "required": true}, "type": {"type": "string"}, "contact_id": {"type": "string"}, "deal_id": {"type": "string"}, "is_completed": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('activity_get', 'Get single activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "activity_id": {"type": "string", "required": true}}', true, true),
('activity_create', 'Create activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "type": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "description": {"type": "string"}, "contact_id": {"type": "string"}, "deal_id": {"type": "string"}, "due_date": {"type": "string"}}', true, true),
('activity_update', 'Update activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "activity_id": {"type": "string", "required": true}, "subject": {"type": "string"}, "description": {"type": "string"}, "due_date": {"type": "string"}}', true, true),
('activity_delete', 'Delete activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "activity_id": {"type": "string", "required": true}}', true, true),
('activity_mark_complete', 'Mark activity complete', 'crm', '{"workspace_id": {"type": "string", "required": true}, "activity_id": {"type": "string", "required": true}}', true, true),
('activity_log_call', 'Log a call activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "contact_id": {"type": "string"}, "deal_id": {"type": "string"}, "description": {"type": "string"}, "duration_minutes": {"type": "integer"}}', true, true),
('activity_log_email', 'Log an email activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "contact_id": {"type": "string"}, "deal_id": {"type": "string"}, "description": {"type": "string"}}', true, true),
('activity_log_meeting', 'Log a meeting activity', 'crm', '{"workspace_id": {"type": "string", "required": true}, "subject": {"type": "string", "required": true}, "contact_id": {"type": "string"}, "deal_id": {"type": "string"}, "description": {"type": "string"}, "meeting_date": {"type": "string"}}', true, true),
('activity_get_overdue', 'Get overdue activities', 'crm', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('activity_get_upcoming', 'Get upcoming activities', 'crm', '{"workspace_id": {"type": "string", "required": true}, "days_ahead": {"type": "integer"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- TEAM DEPARTMENT (38 tools)
-- Workspace & Members (8 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('workspace_get', 'Get workspace details', 'team', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('workspace_update', 'Update workspace settings', 'team', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string"}, "avatar_url": {"type": "string"}}', true, true),
('workspace_member_list', 'List workspace members', 'team', '{"workspace_id": {"type": "string", "required": true}, "role": {"type": "string"}}', true, true),
('workspace_member_get', 'Get member details', 'team', '{"workspace_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}}', true, true),
('workspace_member_invite', 'Invite user to workspace', 'team', '{"workspace_id": {"type": "string", "required": true}, "email": {"type": "string", "required": true}, "role": {"type": "string"}}', true, true),
('workspace_member_update_role', 'Update member role', 'team', '{"workspace_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}, "role": {"type": "string", "required": true}}', true, true),
('workspace_member_remove', 'Remove member from workspace', 'team', '{"workspace_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}}', true, true),
('workspace_member_set_status', 'Set member status', 'team', '{"workspace_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}, "status": {"type": "string", "required": true}, "status_text": {"type": "string"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Channels (11 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('channel_list', 'List all channels', 'team', '{"workspace_id": {"type": "string", "required": true}, "include_private": {"type": "boolean"}}', true, true),
('channel_get', 'Get channel details', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}}', true, true),
('channel_create', 'Create channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "description": {"type": "string"}, "is_private": {"type": "boolean"}}', true, true),
('channel_update', 'Update channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}}', true, true),
('channel_delete', 'Delete/archive channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}}', true, true),
('channel_join', 'Join channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}}', true, true),
('channel_leave', 'Leave channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}}', true, true),
('channel_add_member', 'Add member to channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}}', true, true),
('channel_remove_member', 'Remove member from channel', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}}', true, true),
('channel_get_members', 'List channel members', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}}', true, true),
('channel_set_notifications', 'Set notification preferences', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string", "required": true}, "notifications": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Messages (12 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('message_list', 'List messages in channel/DM', 'team', '{"workspace_id": {"type": "string", "required": true}, "channel_id": {"type": "string"}, "dm_conversation_id": {"type": "string"}, "limit": {"type": "integer"}, "before": {"type": "string"}, "after": {"type": "string"}}', true, true),
('message_get', 'Get single message', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}}', true, true),
('message_send', 'Send message', 'team', '{"workspace_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}, "channel_id": {"type": "string"}, "dm_conversation_id": {"type": "string"}, "parent_id": {"type": "string"}}', true, true),
('message_update', 'Edit message', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('message_delete', 'Delete message', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}}', true, true),
('message_reply', 'Reply in thread', 'team', '{"workspace_id": {"type": "string", "required": true}, "parent_message_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('message_add_reaction', 'Add emoji reaction', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}, "emoji": {"type": "string", "required": true}}', true, true),
('message_remove_reaction', 'Remove emoji reaction', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}, "emoji": {"type": "string", "required": true}}', true, true),
('message_search', 'Search messages', 'team', '{"workspace_id": {"type": "string", "required": true}, "query": {"type": "string", "required": true}, "channel_id": {"type": "string"}, "sender_id": {"type": "string"}}', true, true),
('message_get_thread', 'Get thread replies', 'team', '{"workspace_id": {"type": "string", "required": true}, "parent_message_id": {"type": "string", "required": true}}', true, true),
('message_pin', 'Pin message', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}}', true, true),
('message_unpin', 'Unpin message', 'team', '{"workspace_id": {"type": "string", "required": true}, "message_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Direct Messages (7 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('dm_list_conversations', 'List DM conversations', 'team', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('dm_get_conversation', 'Get DM conversation', 'team', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}}', true, true),
('dm_create_conversation', 'Start DM conversation', 'team', '{"workspace_id": {"type": "string", "required": true}, "participant_ids": {"type": "array", "required": true}}', true, true),
('dm_get_or_create', 'Get or create DM', 'team', '{"workspace_id": {"type": "string", "required": true}, "participant_id": {"type": "string", "required": true}}', true, true),
('dm_archive_conversation', 'Archive DM conversation', 'team', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}}', true, true),
('dm_mark_read', 'Mark DM as read', 'team', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}}', true, true),
('dm_get_unread_count', 'Get unread DM count', 'team', '{"workspace_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- PROJECTS DEPARTMENT (40 tools)
-- Departments (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('department_list', 'List all departments', 'projects', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('department_get', 'Get single department', 'projects', '{"workspace_id": {"type": "string", "required": true}, "department_id": {"type": "string", "required": true}}', true, true),
('department_create', 'Create department', 'projects', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "description": {"type": "string"}, "color": {"type": "string"}, "icon": {"type": "string"}}', true, true),
('department_update', 'Update department', 'projects', '{"workspace_id": {"type": "string", "required": true}, "department_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "color": {"type": "string"}, "icon": {"type": "string"}}', true, true),
('department_delete', 'Delete department', 'projects', '{"workspace_id": {"type": "string", "required": true}, "department_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Projects (11 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('project_list', 'List all projects', 'projects', '{"workspace_id": {"type": "string", "required": true}, "status": {"type": "string"}, "department_id": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('project_get', 'Get project with details', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}}', true, true),
('project_create', 'Create project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "description": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}, "start_date": {"type": "string"}, "target_end_date": {"type": "string"}, "budget": {"type": "number"}, "department_id": {"type": "string"}}', true, true),
('project_update', 'Update project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}, "target_end_date": {"type": "string"}, "budget": {"type": "number"}}', true, true),
('project_delete', 'Delete project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}}', true, true),
('project_archive', 'Archive project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}}', true, true),
('project_add_member', 'Add member to project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}, "role": {"type": "string"}, "hours_per_week": {"type": "number"}}', true, true),
('project_remove_member', 'Remove member from project', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "member_id": {"type": "string", "required": true}}', true, true),
('project_get_members', 'List project members', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}}', true, true),
('project_get_progress', 'Get project progress stats', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}}', true, true),
('project_get_activity', 'Get project activity log', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "limit": {"type": "integer"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Tasks (16 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('task_list', 'List tasks', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string"}, "assignee_id": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}, "milestone_id": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('task_get', 'Get task with details', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('task_create', 'Create task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "title": {"type": "string", "required": true}, "description": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}, "assignee_id": {"type": "string"}, "due_date": {"type": "string"}, "estimated_hours": {"type": "number"}, "parent_task_id": {"type": "string"}}', true, true),
('task_update', 'Update task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "title": {"type": "string"}, "description": {"type": "string"}, "status": {"type": "string"}, "priority": {"type": "string"}, "due_date": {"type": "string"}, "estimated_hours": {"type": "number"}, "actual_hours": {"type": "number"}}', true, true),
('task_delete', 'Delete task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('task_assign', 'Assign task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "assignee_id": {"type": "string", "required": true}}', true, true),
('task_unassign', 'Unassign task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "assignee_id": {"type": "string", "required": true}}', true, true),
('task_change_status', 'Change task status', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "status": {"type": "string", "required": true}}', true, true),
('task_add_dependency', 'Add task dependency', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "depends_on_task_id": {"type": "string", "required": true}, "type": {"type": "string"}}', true, true),
('task_remove_dependency', 'Remove task dependency', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "depends_on_task_id": {"type": "string", "required": true}}', true, true),
('task_add_label', 'Add label to task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "label_id": {"type": "string", "required": true}}', true, true),
('task_remove_label', 'Remove label from task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "label_id": {"type": "string", "required": true}}', true, true),
('task_add_comment', 'Add comment to task', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('task_get_comments', 'Get task comments', 'projects', '{"workspace_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('task_get_my_tasks', 'Get current user tasks', 'projects', '{"workspace_id": {"type": "string", "required": true}, "status": {"type": "string"}}', true, true),
('task_get_overdue', 'Get overdue tasks', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Milestones (8 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('milestone_list', 'List milestones', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "status": {"type": "string"}}', true, true),
('milestone_get', 'Get milestone with tasks', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}}', true, true),
('milestone_create', 'Create milestone', 'projects', '{"workspace_id": {"type": "string", "required": true}, "project_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "target_date": {"type": "string", "required": true}, "description": {"type": "string"}}', true, true),
('milestone_update', 'Update milestone', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "target_date": {"type": "string"}, "status": {"type": "string"}}', true, true),
('milestone_delete', 'Delete milestone', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}}', true, true),
('milestone_add_task', 'Add task to milestone', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('milestone_remove_task', 'Remove task from milestone', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}, "task_id": {"type": "string", "required": true}}', true, true),
('milestone_get_progress', 'Get milestone progress', 'projects', '{"workspace_id": {"type": "string", "required": true}, "milestone_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- KNOWLEDGE DEPARTMENT (36 tools)
-- Categories (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('knowledge_category_list', 'List knowledge categories', 'knowledge', '{"workspace_id": {"type": "string", "required": true}}', true, true),
('knowledge_category_get', 'Get category with pages', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true),
('knowledge_category_create', 'Create knowledge category', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "slug": {"type": "string"}, "color": {"type": "string"}, "icon": {"type": "string"}}', true, true),
('knowledge_category_update', 'Update knowledge category', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}, "name": {"type": "string"}, "color": {"type": "string"}, "icon": {"type": "string"}, "position": {"type": "integer"}}', true, true),
('knowledge_category_delete', 'Delete knowledge category', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Templates (6 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('knowledge_template_list', 'List knowledge templates', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "include_system": {"type": "boolean"}, "category": {"type": "string"}}', true, true),
('knowledge_template_get', 'Get knowledge template', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "template_id": {"type": "string", "required": true}}', true, true),
('knowledge_template_create', 'Create knowledge template', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "content": {"type": "string", "required": true}, "description": {"type": "string"}, "icon": {"type": "string"}, "category": {"type": "string"}}', true, true),
('knowledge_template_update', 'Update knowledge template', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "template_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "icon": {"type": "string"}, "category": {"type": "string"}, "content": {"type": "string"}}', true, true),
('knowledge_template_delete', 'Delete knowledge template', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "template_id": {"type": "string", "required": true}}', true, true),
('knowledge_template_use', 'Create page from template', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "template_id": {"type": "string", "required": true}, "title": {"type": "string", "required": true}, "parent_id": {"type": "string"}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Pages (16 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('knowledge_page_list', 'List knowledge pages', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "category_id": {"type": "string"}, "parent_id": {"type": "string"}, "is_archived": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('knowledge_page_get', 'Get page with content', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_create', 'Create knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "title": {"type": "string", "required": true}, "content": {"type": "string"}, "parent_id": {"type": "string"}, "icon": {"type": "string"}, "cover_image": {"type": "string"}, "template_id": {"type": "string"}}', true, true),
('knowledge_page_update', 'Update knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}, "title": {"type": "string"}, "content": {"type": "string"}, "icon": {"type": "string"}, "cover_image": {"type": "string"}}', true, true),
('knowledge_page_delete', 'Delete knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_archive', 'Archive knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_restore', 'Restore knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_move', 'Move page to parent', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}, "new_parent_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_duplicate', 'Duplicate knowledge page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_favorite', 'Add page to favorites', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_unfavorite', 'Remove page from favorites', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_search', 'Search knowledge pages', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "query": {"type": "string", "required": true}}', true, true),
('knowledge_page_get_children', 'Get page children', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_reorder', 'Reorder pages', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_ids": {"type": "array", "required": true}, "parent_id": {"type": "string"}}', true, true),
('knowledge_page_add_category', 'Add category to page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true),
('knowledge_page_remove_category', 'Remove category from page', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "page_id": {"type": "string", "required": true}, "category_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Whiteboards (9 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('knowledge_whiteboard_list', 'List whiteboards', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "is_archived": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('knowledge_whiteboard_get', 'Get whiteboard with content', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true),
('knowledge_whiteboard_create', 'Create whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "title": {"type": "string", "required": true}, "icon": {"type": "string"}, "content": {"type": "string"}}', true, true),
('knowledge_whiteboard_update', 'Update whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}, "title": {"type": "string"}, "icon": {"type": "string"}, "content": {"type": "string"}, "thumbnail": {"type": "string"}}', true, true),
('knowledge_whiteboard_delete', 'Delete whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true),
('knowledge_whiteboard_archive', 'Archive whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true),
('knowledge_whiteboard_restore', 'Restore whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true),
('knowledge_whiteboard_favorite', 'Favorite whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true),
('knowledge_whiteboard_unfavorite', 'Unfavorite whiteboard', 'knowledge', '{"workspace_id": {"type": "string", "required": true}, "whiteboard_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- COMMUNICATIONS DEPARTMENT (14 tools)
-- Phone Numbers (4 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('phone_number_list', 'List user phone numbers', 'communications', '{"user_id": {"type": "string", "required": true}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('phone_number_provision', 'Provision new phone number', 'communications', '{"user_id": {"type": "string", "required": true}, "area_code": {"type": "string"}, "country": {"type": "string"}}', true, true),
('phone_number_release', 'Release phone number', 'communications', '{"user_id": {"type": "string", "required": true}, "phone_number_id": {"type": "string", "required": true}}', true, true),
('phone_number_set_default', 'Set default outbound number', 'communications', '{"user_id": {"type": "string", "required": true}, "phone_number_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- SMS (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('sms_send', 'Send SMS message', 'communications', '{"user_id": {"type": "string", "required": true}, "to_phone": {"type": "string", "required": true}, "body": {"type": "string", "required": true}, "from_number": {"type": "string"}, "lead_id": {"type": "string"}, "contact_id": {"type": "string"}}', true, true),
('sms_list', 'List SMS messages', 'communications', '{"user_id": {"type": "string", "required": true}, "phone_number": {"type": "string"}, "direction": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('sms_get_conversation', 'Get SMS thread', 'communications', '{"user_id": {"type": "string", "required": true}, "phone_number": {"type": "string", "required": true}}', true, true),
('sms_get_threads', 'List all SMS threads', 'communications', '{"user_id": {"type": "string", "required": true}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('sms_mark_thread_read', 'Mark SMS thread as read', 'communications', '{"user_id": {"type": "string", "required": true}, "phone_number": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Calls (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('call_initiate', 'Start outbound call', 'communications', '{"user_id": {"type": "string", "required": true}, "to_phone": {"type": "string", "required": true}, "from_number": {"type": "string"}, "lead_id": {"type": "string"}, "contact_id": {"type": "string"}}', true, true),
('call_get', 'Get call details', 'communications', '{"user_id": {"type": "string", "required": true}, "call_id": {"type": "string", "required": true}}', true, true),
('call_list', 'List calls', 'communications', '{"user_id": {"type": "string", "required": true}, "direction": {"type": "string"}, "status": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('call_get_recording', 'Get call recording URL', 'communications', '{"user_id": {"type": "string", "required": true}, "call_id": {"type": "string", "required": true}}', true, true),
('call_end', 'End active call', 'communications', '{"user_id": {"type": "string", "required": true}, "call_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- GOALS & KPIs DEPARTMENT (21 tools)
-- Goals (7 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('goal_list', 'List all goals', 'goals', '{"profile_id": {"type": "string", "required": true}, "type": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('goal_get', 'Get goal with progress', 'goals', '{"profile_id": {"type": "string", "required": true}, "goal_id": {"type": "string", "required": true}}', true, true),
('goal_create', 'Create goal', 'goals', '{"profile_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "type": {"type": "string", "required": true}, "target_amount": {"type": "number", "required": true}, "target_date": {"type": "string", "required": true}, "description": {"type": "string"}}', true, true),
('goal_update', 'Update goal', 'goals', '{"profile_id": {"type": "string", "required": true}, "goal_id": {"type": "string", "required": true}, "name": {"type": "string"}, "target_amount": {"type": "number"}, "target_date": {"type": "string"}, "description": {"type": "string"}}', true, true),
('goal_delete', 'Delete goal', 'goals', '{"profile_id": {"type": "string", "required": true}, "goal_id": {"type": "string", "required": true}}', true, true),
('goal_get_progress', 'Get goal progress', 'goals', '{"profile_id": {"type": "string", "required": true}, "goal_id": {"type": "string", "required": true}}', true, true),
('goal_update_progress', 'Manual progress update', 'goals', '{"profile_id": {"type": "string", "required": true}, "goal_id": {"type": "string", "required": true}, "current_amount": {"type": "number", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Exit Plan (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('exit_plan_get', 'Get exit plan', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true),
('exit_plan_create', 'Create exit plan', 'goals', '{"profile_id": {"type": "string", "required": true}, "target_valuation": {"type": "number", "required": true}, "target_date": {"type": "string", "required": true}, "exit_type": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('exit_plan_update', 'Update exit plan', 'goals', '{"profile_id": {"type": "string", "required": true}, "target_valuation": {"type": "number"}, "current_valuation": {"type": "number"}, "target_multiple": {"type": "number"}, "target_runway": {"type": "number"}, "target_date": {"type": "string"}, "exit_type": {"type": "string"}, "notes": {"type": "string"}}', true, true),
('exit_plan_delete', 'Delete exit plan', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true),
('exit_plan_get_scenarios', 'Get exit scenarios', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- KPIs (9 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('kpi_list', 'List KPI records', 'goals', '{"profile_id": {"type": "string", "required": true}, "industry": {"type": "string"}, "period": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('kpi_get', 'Get KPI record', 'goals', '{"profile_id": {"type": "string", "required": true}, "kpi_id": {"type": "string", "required": true}}', true, true),
('kpi_record', 'Record KPI values', 'goals', '{"profile_id": {"type": "string", "required": true}, "period_start": {"type": "string", "required": true}, "period_end": {"type": "string", "required": true}, "revenue": {"type": "number"}, "expenses": {"type": "number"}, "customer_count": {"type": "integer"}}', true, true),
('kpi_update', 'Update KPI values', 'goals', '{"profile_id": {"type": "string", "required": true}, "kpi_id": {"type": "string", "required": true}, "revenue": {"type": "number"}, "expenses": {"type": "number"}, "customer_count": {"type": "integer"}}', true, true),
('kpi_delete', 'Delete KPI record', 'goals', '{"profile_id": {"type": "string", "required": true}, "kpi_id": {"type": "string", "required": true}}', true, true),
('kpi_get_trends', 'Get KPI trends over time', 'goals', '{"profile_id": {"type": "string", "required": true}, "metric_name": {"type": "string", "required": true}, "periods": {"type": "integer"}}', true, true),
('kpi_get_saas_metrics', 'Get SaaS-specific metrics', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true),
('kpi_get_retail_metrics', 'Get retail-specific metrics', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true),
('kpi_get_service_metrics', 'Get service-specific metrics', 'goals', '{"profile_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- AGENTS DEPARTMENT (27 tools)
-- Agents (8 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('agent_list', 'List workspace agents', 'agents', '{"workspace_id": {"type": "string", "required": true}, "is_active": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('agent_get', 'Get agent details', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}}', true, true),
('agent_create', 'Create agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "description": {"type": "string"}, "system_prompt": {"type": "string"}, "model": {"type": "string"}, "tools": {"type": "array"}, "skill_ids": {"type": "array"}}', true, true),
('agent_update', 'Update agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "system_prompt": {"type": "string"}, "model": {"type": "string"}, "tools": {"type": "array"}, "is_active": {"type": "boolean"}}', true, true),
('agent_delete', 'Delete agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}}', true, true),
('agent_add_skill', 'Add skill to agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "skill_id": {"type": "string", "required": true}}', true, true),
('agent_remove_skill', 'Remove skill from agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "skill_id": {"type": "string", "required": true}}', true, true),
('agent_get_skills', 'Get agent skills', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Agent Conversations (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('agent_conversation_list', 'List agent conversations', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('agent_conversation_get', 'Get conversation with messages', 'agents', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}}', true, true),
('agent_conversation_create', 'Start agent conversation', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "title": {"type": "string"}}', true, true),
('agent_conversation_send_message', 'Send message to agent', 'agents', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('agent_conversation_delete', 'Delete conversation', 'agents', '{"workspace_id": {"type": "string", "required": true}, "conversation_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Agent Memories (5 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('agent_memory_list', 'List agent memories', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('agent_memory_create', 'Create agent memory', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "path": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('agent_memory_update', 'Update agent memory', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "memory_id": {"type": "string", "required": true}, "content": {"type": "string", "required": true}}', true, true),
('agent_memory_delete', 'Delete agent memory', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "memory_id": {"type": "string", "required": true}}', true, true),
('agent_memory_search', 'Search agent memories', 'agents', '{"workspace_id": {"type": "string", "required": true}, "agent_id": {"type": "string", "required": true}, "query": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- Workflows (9 tools)
INSERT INTO agent_tools (name, description, category, input_schema, is_builtin, is_enabled) VALUES
('workflow_list', 'List workflows', 'agents', '{"user_id": {"type": "string", "required": true}, "is_active": {"type": "boolean"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('workflow_get', 'Get workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}}', true, true),
('workflow_create', 'Create workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "name": {"type": "string", "required": true}, "trigger_type": {"type": "string", "required": true}, "actions": {"type": "array", "required": true}, "description": {"type": "string"}, "trigger_config": {"type": "object"}, "is_active": {"type": "boolean"}}', true, true),
('workflow_update', 'Update workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}, "name": {"type": "string"}, "description": {"type": "string"}, "trigger_type": {"type": "string"}, "trigger_config": {"type": "object"}, "actions": {"type": "array"}, "is_active": {"type": "boolean"}}', true, true),
('workflow_delete', 'Delete workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}}', true, true),
('workflow_execute', 'Manual workflow execution', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}, "input": {"type": "object"}}', true, true),
('workflow_get_executions', 'Get workflow execution history', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}', true, true),
('workflow_enable', 'Enable workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}}', true, true),
('workflow_disable', 'Disable workflow', 'agents', '{"user_id": {"type": "string", "required": true}, "workflow_id": {"type": "string", "required": true}}', true, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
DO $$
DECLARE
  tables TEXT[] := ARRAY['agent_departments', 'mcp_integrations', 'agent_tools', 'agent_skills', 'ai_agents'];
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    FOREACH t IN ARRAY tables LOOP
      EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      ', t, t);
    END LOOP;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Triggers already exist, ignore
  NULL;
END $$;
