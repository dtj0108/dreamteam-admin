-- 061_skills_teaching_system.sql
-- Skills Library + Teaching System for Agent Builder

-- ============================================
-- EXTEND AGENT_SKILLS TABLE
-- ============================================
ALTER TABLE agent_skills
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS templates JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS edge_cases JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS learned_rules_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Add unique constraint on name for ON CONFLICT to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_skills_name_unique'
  ) THEN
    ALTER TABLE agent_skills ADD CONSTRAINT agent_skills_name_unique UNIQUE (name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_skills_category ON agent_skills(category);
CREATE INDEX IF NOT EXISTS idx_agent_skills_system ON agent_skills(is_system);

-- ============================================
-- SKILL TEACHINGS (User Corrections)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_teachings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- The original and corrected outputs
  original_output TEXT NOT NULL,
  corrected_output TEXT NOT NULL,

  -- Context about when this teaching occurred
  conversation_id UUID,
  message_context JSONB DEFAULT '{}',
  user_instruction TEXT,

  -- Analysis results from Claude
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_result JSONB DEFAULT '{}',

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_skill_teachings_skill ON skill_teachings(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_teachings_workspace ON skill_teachings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_teachings_status ON skill_teachings(analysis_status);
CREATE INDEX IF NOT EXISTS idx_skill_teachings_created ON skill_teachings(created_at DESC);

-- ============================================
-- SKILL LEARNED RULES (Extracted Patterns)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_learned_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  teaching_id UUID REFERENCES skill_teachings(id) ON DELETE SET NULL,

  -- Rule classification
  rule_type TEXT NOT NULL CHECK (rule_type IN ('instruction', 'template', 'edge_case', 'trigger', 'tone', 'format')),

  -- The actual rule content
  rule_content TEXT NOT NULL,
  rule_description TEXT,

  -- Conditions for when this rule applies
  conditions JSONB DEFAULT '{}',

  -- Scope: workspace-specific or promoted to global
  scope TEXT DEFAULT 'workspace' CHECK (scope IN ('workspace', 'global')),
  workspace_id UUID,

  -- Confidence and usage metrics
  confidence_score NUMERIC DEFAULT 0.8 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  times_applied INTEGER DEFAULT 0,
  times_successful INTEGER DEFAULT 0,

  -- Admin review for global promotion
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  -- Tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_learned_rules_skill ON skill_learned_rules(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_learned_rules_type ON skill_learned_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_skill_learned_rules_scope ON skill_learned_rules(scope);
CREATE INDEX IF NOT EXISTS idx_skill_learned_rules_workspace ON skill_learned_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_skill_learned_rules_active ON skill_learned_rules(is_active) WHERE is_active = true;

-- ============================================
-- SKILL VERSIONS (History)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,

  -- Snapshot of skill content at this version
  skill_content TEXT NOT NULL,
  triggers JSONB DEFAULT '[]',
  templates JSONB DEFAULT '[]',
  edge_cases JSONB DEFAULT '[]',

  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'manual_edit', 'learned_rule_added', 'rule_promoted', 'rollback')),
  change_description TEXT,
  change_details JSONB DEFAULT '{}',

  -- Who made the change
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(skill_id, version)
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_versions_version ON skill_versions(skill_id, version DESC);

-- ============================================
-- TEACHING PATTERNS (Admin Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_teaching_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,

  -- Pattern identification
  pattern_type TEXT NOT NULL,
  pattern_signature TEXT NOT NULL,
  pattern_description TEXT,

  -- Occurrences
  occurrence_count INTEGER DEFAULT 1,
  workspace_ids UUID[] DEFAULT '{}',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Sample teachings that match this pattern
  sample_teaching_ids UUID[] DEFAULT '{}',

  -- Admin action tracking
  is_promoted BOOLEAN DEFAULT false,
  promoted_to_rule_id UUID REFERENCES skill_learned_rules(id) ON DELETE SET NULL,

  UNIQUE(skill_id, pattern_signature)
);

CREATE INDEX IF NOT EXISTS idx_teaching_patterns_skill ON skill_teaching_patterns(skill_id);
CREATE INDEX IF NOT EXISTS idx_teaching_patterns_count ON skill_teaching_patterns(occurrence_count DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE skill_teachings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_learned_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_teaching_patterns ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage everything
CREATE POLICY "Superadmins can manage skill_teachings" ON skill_teachings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage skill_learned_rules" ON skill_learned_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage skill_versions" ON skill_versions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

CREATE POLICY "Superadmins can manage skill_teaching_patterns" ON skill_teaching_patterns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_skill_learned_rules_updated_at
    BEFORE UPDATE ON skill_learned_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- SEED SAMPLE SKILLS
-- ============================================
INSERT INTO agent_skills (name, description, department_id, skill_content, category, triggers, templates, edge_cases, is_system, is_enabled)
VALUES
-- Cold Outreach Skill
('cold-outreach', 'Execute multi-touch cold outreach sequences to prospects', NULL,
'# Cold Outreach Skill

## Overview
Guide for writing effective cold outreach emails to potential clients.

## Instructions

### Step 1: Research
Before writing, gather:
- Recipient''s name and title
- Company name and what they do
- Recent news or achievements
- Potential pain points

### Step 2: Subject Line
- Keep under 50 characters
- Be specific, not generic
- Personalize when possible

### Step 3: Opening
- Reference something specific about them
- Don''t start with "I" or your company
- Hook their attention in first sentence

### Step 4: Value Proposition
- Focus on THEIR problems, not your features
- Be specific about outcomes
- Use numbers when possible

### Step 5: Call to Action
- One clear, low-commitment ask
- Suggest specific times
- Make it easy to respond',
'sales',
'["reach out to", "cold outreach", "prospect", "send cold email", "write outreach"]'::jsonb,
'[{"id": "initial-outreach", "name": "Initial Outreach", "description": "First touch email template", "content": "Subject: {{specific_hook}} for {{company_name}}\n\nHi {{first_name}},\n\n{{personalized_opener_referencing_their_work}}\n\nI noticed {{observation_about_their_business}}. At {{our_company}}, we help companies like {{company_name}} {{specific_outcome}}.\n\n{{one_sentence_value_prop}}\n\nWould you be open to a 15-minute call {{suggested_timeframe}} to see if this could help {{company_name}}?\n\nBest,\n{{sender_name}}", "variables": [{"name": "specific_hook", "description": "Personalized hook", "required": true}, {"name": "company_name", "description": "Prospect company", "required": true}, {"name": "first_name", "description": "Recipient first name", "required": true}], "tags": ["email", "first-touch"]}]'::jsonb,
'[{"id": "c-level", "condition": "Recipient is a C-level executive", "instructions": ["Keep email under 100 words", "Lead with biggest impact metric", "Mention peer companies using your solution", "Suggest their assistant schedule the call"], "priority": 1}, {"id": "startup", "condition": "Company is a startup (<50 employees)", "instructions": ["Emphasize speed and flexibility", "Focus on growth-stage problems", "Be more casual in tone"], "priority": 2}]'::jsonb,
true, true),

-- Meeting Booking Skill
('meeting-booking', 'Schedule and manage meetings with contacts', NULL,
'# Meeting Booking Skill

## Overview
Guide for efficiently scheduling meetings while respecting everyone''s time.

## Instructions

### Step 1: Identify Purpose
- Clarify meeting objective
- Determine required attendees
- Estimate duration needed

### Step 2: Check Availability
- Review calendar for open slots
- Consider time zones
- Allow buffer between meetings

### Step 3: Send Invitation
- Clear subject line with purpose
- Include agenda
- Provide video link or location
- Add relevant attachments

### Step 4: Confirm & Remind
- Send confirmation
- Add to relevant calendars
- Send reminder 24h before',
'productivity',
'["schedule meeting", "book meeting", "set up call", "arrange meeting"]'::jsonb,
'[{"id": "meeting-request", "name": "Meeting Request", "description": "Request a meeting with someone", "content": "Hi {{name}},\n\nI''d like to schedule a {{duration}} meeting to discuss {{topic}}.\n\nWould any of these times work for you?\n{{available_slots}}\n\nLet me know what works best.\n\nBest,\n{{sender}}", "variables": [{"name": "name", "description": "Recipient name", "required": true}, {"name": "duration", "description": "Meeting length", "required": true}, {"name": "topic", "description": "Meeting topic", "required": true}], "tags": ["scheduling"]}]'::jsonb,
'[{"id": "external", "condition": "Meeting is with external party", "instructions": ["Use more formal tone", "Include company context", "Offer multiple time options"], "priority": 1}]'::jsonb,
true, true),

-- Status Reporting Skill
('status-reporting', 'Generate clear status updates and reports', NULL,
'# Status Reporting Skill

## Overview
Create concise, informative status updates for projects and tasks.

## Instructions

### Step 1: Gather Information
- Review recent activity
- Check task completion status
- Identify blockers or risks
- Note upcoming milestones

### Step 2: Structure Report
- Start with summary/headline
- Use bullet points for details
- Highlight key metrics
- List action items

### Step 3: Tailor to Audience
- Executive: High-level, outcomes-focused
- Team: Detailed, task-oriented
- Client: Progress and next steps',
'productivity',
'["status update", "status report", "progress report", "weekly update"]'::jsonb,
'[{"id": "weekly-status", "name": "Weekly Status", "description": "Weekly project status template", "content": "## Weekly Status: {{project_name}}\n**Week of {{date}}**\n\n### Summary\n{{summary}}\n\n### Completed This Week\n{{completed_items}}\n\n### In Progress\n{{in_progress_items}}\n\n### Blockers\n{{blockers}}\n\n### Next Week\n{{next_week_items}}", "variables": [{"name": "project_name", "description": "Project name", "required": true}, {"name": "date", "description": "Week date", "required": true}], "tags": ["weekly", "status"]}]'::jsonb,
'[]'::jsonb,
true, true)

ON CONFLICT (name) DO NOTHING;
