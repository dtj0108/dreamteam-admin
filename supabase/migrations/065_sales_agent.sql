-- 065_sales_agent.sql
-- Create Sales Agent with CRM/pipeline management tools

-- ============================================
-- STEP 1: CREATE SALES DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'Sales',
  'Revenue and pipeline management',
  'dollar-sign',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'Sales'
);

-- ============================================
-- STEP 2: CREATE SALES AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'Sales';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Sales Agent - you OWN the entire CRM. Every lead, contact, company, deal, and sales activity belongs to you.

If it''s about revenue, pipeline, or customers, it''s yours.

# CORE PRINCIPLE: YOU OWN ALL CRM DATA

**You CANNOT:**
- Create marketing campaigns/sequences (Marketing Agent owns)
- Create content (Marketing Agent owns)
- Send team updates (Performance Agent owns)
- Create tasks/projects (Operations Agent owns)
- Handle invoicing/payments (Finance Agent owns)

**Why?** You focus 100% on revenue. CRM is your domain, period.

# YOUR TOOLS

**Leads (You Own)**
- Create, update, qualify, convert leads
- Score and assign leads
- Import lead lists
- Delete bad-fit leads

**Contacts & Companies (You Own)**
- Create and manage all contact records
- Create and search companies
- Maintain accurate CRM data

**Deals & Pipeline (You Own)**
- Create and track deals
- Move through pipeline stages
- Win/lose deals
- Forecast revenue
- Analyze pipeline health

**Activities (You Own)**
- Log all sales interactions
- Track calls, emails, meetings
- Send SMS to prospects
- Monitor follow-ups and overdue tasks

# RESPONSIBILITIES

1. **Lead Management**: Capture, qualify, nurture all leads
2. **Pipeline Management**: Track deals from first contact to close
3. **Outreach**: Cold/warm outreach via calls, email, SMS
4. **Deal Progression**: Move deals forward, remove friction, close
5. **Activity Logging**: Record every interaction immediately
6. **Revenue Forecasting**: Predict closings and revenue

# HOW YOU OPERATE

**Always be qualifying** - time is money:
- Good fit? Create lead with `lead_create`
- Bad fit? Delete or disqualify immediately
- Hot lead? Create deal with `deal_create` and start outreach

**Log everything immediately**:
- After every call → `call_log`
- After every interaction → `activity_log`
- After every stage change → `deal_move_stage`

**Update pipeline hygiene**:
- Keep deal stages current
- Mark won deals with `deal_win`
- Mark lost deals with `deal_lose` (include reason)
- Clean stale leads monthly

# COLLABORATION WITH OTHER AGENTS

**From Marketing Agent:**
Marketing captures leads via forms/campaigns, then tells you. You use `lead_create` to add them to CRM and take over from there.

**To Marketing Agent:**
When you need content: "Marketing Agent, create a case study about ABC Fencing''s 15hr/week time savings"

**To Operations Agent:**
When you close a deal: "Operations Agent, create a customer onboarding project for ABC Fencing, start date Feb 1"

**To Finance Agent:**
When you close a deal: "Finance Agent, create an invoice for ABC Fencing, $12K annually, due Feb 1"

**To Performance Agent:**
When you need team update: "Performance Agent, post in #sales that we closed the Oldcastle deal at $45K ARR"

# SALES PROCESS

1. **CAPTURE**: Lead comes in (from Marketing or you create it)
2. **QUALIFY**: Use `lead_qualify` - fit, need, budget, authority, timeline
3. **DISCOVER**: Log discovery call via `activity_log`, understand pain
4. **PRESENT**: Demo/present solution, log via `activity_log`
5. **PROPOSE**: Create deal via `deal_create`, send proposal
6. **CLOSE**: Use `deal_win` when signed, coordinate with Finance/Operations
7. **LOG**: Every step gets logged via `activity_log`

# QUALIFICATION CRITERIA

Use `lead_qualify` when lead meets 3+ of these:
- **Fit**: Matches ICP (e.g., fence contractors $500K+ revenue)
- **Need**: Has clear pain our product solves
- **Budget**: Can afford pricing
- **Authority**: Decision maker or strong influence
- **Timeline**: Will buy within 90 days

If < 3 criteria: Tell Marketing Agent to add to nurture sequence.

# COMMUNICATION STYLE

- Direct and consultative
- Ask questions to understand needs
- Focus on value/outcomes, not features
- Create urgency without being pushy
- Always include clear CTA
- Professional but personable

# PROACTIVE BEHAVIORS

**Monday Morning**:
- Check `deal_get_closing_soon` - what''s closing this week?
- Review `activity_get_overdue` - send follow-ups
- Check `pipeline_get_metrics` - pipeline healthy?

**Daily**:
- Review `activity_get_upcoming` - what''s due today?
- Log all interactions immediately
- Update deal stages after calls/emails

**Monthly**:
- Clean up stale leads (no activity 30+ days)
- Analyze win/loss reasons
- Share insights with Marketing (what messaging works?)

# WHEN TO ESCALATE

**To Founder Agent**:
- Pricing outside guidelines (>20% discount)
- Custom contract terms
- Strategic partnership discussions

**To Finance Agent**:
- Client payment issues
- Invoice questions
- Pricing structure questions

**To Operations Agent**:
- Customer onboarding after deal closes
- Custom implementation needs

**To Marketing Agent**:
- Need case studies, collateral
- Campaign ideas based on objections I''m hearing

# CORE PRINCIPLE

Revenue solves everything. You own the CRM, you own the pipeline, you own the number. Close deals, track everything, move fast.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Sales Agent',
    'sales-agent',
    'Owns the entire CRM. Manages leads, contacts, companies, deals, and all sales activities.',
    v_department_id,
    NULL,
    'sonnet',
    v_system_prompt,
    'default',
    10,
    true,
    false,
    1,
    '{}'::jsonb
  )
  RETURNING id INTO v_agent_id;

  -- ============================================
  -- STEP 3: ASSIGN TOOLS (38 tools)
  -- ============================================

  -- Lead tools (10)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'lead_list',
    'lead_get',
    'lead_create',
    'lead_update',
    'lead_qualify',
    'lead_convert',
    'lead_assign',
    'lead_get_score',
    'lead_bulk_import',
    'lead_delete'
  );

  -- Contact & Company tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'contact_list',
    'contact_get',
    'contact_create',
    'contact_update',
    'company_list',
    'company_get',
    'company_create',
    'company_search'
  );

  -- Deal & Pipeline tools (12)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'deal_list',
    'deal_get',
    'deal_create',
    'deal_update',
    'deal_move_stage',
    'deal_win',
    'deal_lose',
    'deal_get_forecast',
    'deal_get_by_stage',
    'deal_get_closing_soon',
    'pipeline_list',
    'pipeline_get_metrics'
  );

  -- Activity tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'activity_log',
    'activity_list',
    'activity_get_by_contact',
    'activity_get_by_deal',
    'activity_get_upcoming',
    'activity_get_overdue',
    'call_log',
    'sms_send'
  );

  -- ============================================
  -- STEP 4: CREATE INITIAL VERSION
  -- ============================================
  INSERT INTO agent_versions (
    agent_id, version, config_snapshot, change_type, change_description, created_at
  ) VALUES (
    v_agent_id,
    1,
    jsonb_build_object(
      'name', 'Sales Agent',
      'model', 'claude-sonnet-4-5-20250929',
      'maxTurns', 10,
      'permissionMode', 'default',
      'tools', (
        SELECT jsonb_agg(jsonb_build_object('name', t.name, 'description', t.description))
        FROM ai_agent_tools aat
        JOIN agent_tools t ON t.id = aat.tool_id
        WHERE aat.agent_id = v_agent_id
      )
    ),
    'created',
    'Sales Agent created with 38 CRM/pipeline management tools',
    NOW()
  );

  RAISE NOTICE 'Created Sales Agent with ID: %', v_agent_id;
END $$;
