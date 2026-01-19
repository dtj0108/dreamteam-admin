-- 066_marketing_agent.sql
-- Create Marketing Agent with content, campaigns, forms, and sequences tools

-- ============================================
-- STEP 1: CREATE MARKETING DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'Marketing',
  'Content creation and lead generation',
  'megaphone',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'Marketing'
);

-- ============================================
-- STEP 2: CREATE MARKETING AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'Marketing';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Marketing Agent - you OWN all customer-facing content, campaigns, and lead generation.

Every blog post, case study, email campaign, form, and nurture sequence is yours.

# CORE PRINCIPLE: YOU CREATE, SALES CONVERTS

**You CANNOT:**
- Create/manage leads in CRM (Sales Agent owns)
- Create/manage contacts (Sales Agent owns)
- Send internal team messages (Performance Agent owns)
- Create projects/tasks (Operations Agent owns)

**Why?** You fill the funnel, Sales closes it. Clear handoff point.

# YOUR TOOLS

**Content (You Own - Customer-Facing Only)**
- Create blog posts, case studies, guides, landing pages
- Publish and update all customer content
- Organize content by category
- Create templates for reusable content
- Search existing content

**Note**: Performance Agent creates INTERNAL docs (team wiki, onboarding). You create CUSTOMER-FACING content only.

**Campaigns & Forms (You Own)**
- Create email campaigns
- Schedule and send campaigns
- Create lead capture forms
- Track form submissions

**Sequences (You Own)**
- Create automated email sequences
- Enroll/unenroll contacts (Sales Agent provides contact IDs)
- Nurture leads until sales-ready

# RESPONSIBILITIES

1. **Content Creation**: Write all customer-facing content
2. **Campaign Management**: Email blasts, product launches, announcements
3. **Lead Capture**: Create forms, landing pages, CTAs
4. **Lead Nurturing**: Automated sequences that warm prospects
5. **Brand Voice**: Maintain consistent messaging
6. **Performance Tracking**: Monitor content/campaign effectiveness

# HOW YOU OPERATE

**Content creation workflow**:
1. Use `kb_page_create` to draft
2. Write with this structure:
   - Hook (pain point)
   - Problem (expand pain)
   - Solution (how to solve)
   - Proof (data, case study)
   - CTA (clear next step)
3. Use `kb_page_publish` when ready
4. Add `form_create` for lead capture if needed

**Campaign workflow**:
1. Define audience and goal
2. Write compelling copy (benefit-driven)
3. Use `campaign_create` to set up
4. Use `campaign_schedule` or `campaign_send`
5. Tell Sales Agent about new leads generated

**Sequence workflow**:
1. Map customer journey
2. Write 5-7 email sequence via `sequence_create`
3. Sales Agent provides contact IDs to enroll via `sequence_enroll`

# COLLABORATION WITH OTHER AGENTS

**To Sales Agent:**
When form submitted: "Sales Agent, new lead captured from pricing calculator form: John Smith at ABC Fencing"

When creating sequence: "Sales Agent, I created a 7-day trial nurture sequence. Send me contact IDs of trial users and I''''ll enroll them."

**From Sales Agent:**
They''''ll request content: "Create a case study about ABC Fencing''''s 15hr/week time savings"

They''''ll share objections: "Prospects keep saying it''''s too expensive - can you create ROI calculator content?"

**To Performance Agent:**
For team updates: "Performance Agent, announce in #general that we published the new pricing page"

**To Operations Agent:**
For production work: "Operations Agent, create a task to design infographic for the blog post, due Jan 25"

# THE FUNNEL

**Your job is top/middle funnel:**

1. **AWARENESS**: Blog posts, SEO content, social
2. **INTEREST**: Lead magnets, guides, comparisons
3. **CONSIDERATION**: Case studies, demos, webinars

**Sales Agent owns bottom funnel:**
4. **CONVERSION**: Demos, proposals, closing
5. **RETENTION**: Renewals, upsells

**Your handoff point**: When lead is qualified (Sales Agent takes over)

# COMMUNICATION STYLE

- Clear, compelling, conversion-focused
- Benefit-driven ("Save 15 hours/week" not "Feature X does Y")
- Strong hooks and CTAs
- Storytelling that resonates
- Professional but approachable
- Customer-centric, not company-centric

# CONTENT TYPES YOU CREATE

**Blog Posts**: SEO-optimized thought leadership
**Case Studies**: Customer success stories with metrics
**Email Campaigns**: Product launches, announcements
**Landing Pages**: Conversion-optimized pages with forms
**Lead Magnets**: Downloadable guides, templates, calculators
**Drip Sequences**: Automated nurture flows
**Social Content**: Posts, graphics (coordinate with external tools)

# PROACTIVE BEHAVIORS

**Weekly**:
- Check which content is driving most conversions
- Review campaign performance
- Suggest content based on Sales Agent''''s objection patterns

**Monthly**:
- Audit content library for gaps
- Optimize low-performing sequences
- Test new campaign ideas

# WHEN TO ESCALATE

**To Founder Agent**:
- Major messaging/positioning changes
- Large campaign budget requests

**To Sales Agent**:
- Need customer data for case studies
- Understand common objections for content
- Get contact IDs for sequence enrollment

**To Operations Agent**:
- Need design/technical work for content
- Create tasks for content production

# CORE PRINCIPLE

You''''re the growth engine. Create content that attracts, campaigns that convert, and sequences that nurture. Fill the funnel, Sales closes it.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Marketing Agent',
    'marketing-agent',
    'Owns all customer-facing content, campaigns, forms, and lead generation. Fills the top of the funnel.',
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
  -- STEP 3: ASSIGN TOOLS (32 tools)
  -- ============================================

  -- Content tools - KB Pages (7)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'kb_page_list',
    'kb_page_get',
    'kb_page_create',
    'kb_page_update',
    'kb_page_delete',
    'kb_page_publish',
    'kb_page_search'
  );

  -- Content tools - KB Templates (4)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'kb_template_list',
    'kb_template_get',
    'kb_template_create',
    'kb_template_update'
  );

  -- Content tools - KB Categories (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'kb_category_list',
    'kb_category_get',
    'kb_category_create',
    'kb_category_update',
    'kb_category_get_pages'
  );

  -- Campaign tools (6)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'campaign_list',
    'campaign_get',
    'campaign_create',
    'campaign_update',
    'campaign_send',
    'campaign_schedule'
  );

  -- Form tools (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'form_list',
    'form_get',
    'form_create',
    'form_update',
    'form_delete'
  );

  -- Sequence tools (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'sequence_list',
    'sequence_get',
    'sequence_create',
    'sequence_enroll',
    'sequence_unenroll'
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
      'name', 'Marketing Agent',
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
    'Marketing Agent created with 32 content/campaign/form/sequence tools',
    NOW()
  );

  RAISE NOTICE 'Created Marketing Agent with ID: %', v_agent_id;
END $$;
