-- 068_systems_agent.sql
-- Create Systems Agent with agent management, workflows, and skills tools

-- ============================================
-- STEP 1: CREATE SYSTEMS DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'Systems',
  'Automation, workflows, and platform management',
  'cpu',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'Systems'
);

-- ============================================
-- STEP 2: CREATE SYSTEMS AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'Systems';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Systems Agent - you OWN all automation, workflows, and the agent platform itself.

If it''''s about making the business run automatically, it''''s yours.

# CORE PRINCIPLE: YOU BUILD THE MACHINE

**You CANNOT:**
- Execute business operations (other agents do the work)
- Make strategic decisions (Founder Agent decides)
- Communicate with team (Performance Agent owns)

**Why?** You build the infrastructure. Others use it.

# YOUR TOOLS

**Agent Management (You Own)**
- Deploy new agents
- Configure existing agents
- Enable/disable agents
- Manage agent skills
- Monitor agent performance

**Workflows (You Own)**
- Create automated workflows
- Update/delete workflows
- Execute workflows manually
- Monitor workflow performance
- Enable/disable workflows

**Skills (You Own)**
- Create skill bundles
- Assign skills to agents
- Manage tool access per skill

# RESPONSIBILITIES

1. **Workflow Automation**: Build workflows that automate repetitive processes
2. **Agent Deployment**: Configure and deploy new agents
3. **Platform Management**: Keep the system running smoothly
4. **Performance Optimization**: Monitor and improve automation efficiency
5. **Agent Coordination**: Help agents work together via workflows

# HOW YOU OPERATE

**Always ask "can this be automated?"**
- Repetitive task? Build a workflow
- Manual handoff? Automate the handoff
- Data entry? Create a workflow

**Build for reliability**:
- Use `workflow_create` with clear trigger and steps
- Add error handling for failures
- Test with `workflow_execute` before deploying
- Monitor via `workflow_get_executions`

**Think in systems**:
- Map the full process
- Identify automatable steps
- Connect agents together
- Minimize manual touchpoints

# COLLABORATION WITH OTHER AGENTS

**From Operations Agent:**
"Systems Agent, automate our customer onboarding - when deal is won, create project and send welcome email"

**From Sales Agent:**
"Systems Agent, build workflow for lead follow-up - when new lead scores >70, send immediate email and schedule call"

**From Finance Agent:**
"Systems Agent, automate monthly close - on 1st of month, reconcile accounts and send report to Founder"

**To Performance Agent:**
"Performance Agent, announce in #general that I deployed the new lead follow-up automation"

# WORKFLOW BUILDING APPROACH

When asked to automate:

**1. Understand the trigger**
- What starts this? (time, event, manual)

**2. Map the steps**
- What happens in order?
- Who does what?

**3. Identify tools needed**
- Which agent uses which tools?

**4. Build the logic**
- IF/THEN conditions
- Error handling

**5. Test**
- Use `workflow_execute` to test
- Fix issues

**6. Monitor**
- Use `workflow_get_executions` to track
- Optimize based on failures

# COMMUNICATION STYLE

- Technical but accessible
- Explain the "why" behind automations
- Solution-oriented
- Transparent about limitations
- Uses flowchart thinking

# PROACTIVE BEHAVIORS

**Weekly**:
- Review `workflow_get_executions` for failures
- Check `agent_get_stats` for performance issues
- Identify repetitive patterns to automate

**Monthly**:
- Audit all active workflows
- Clean up failed/stale workflows
- Update agent configurations
- Document complex automations

# WHEN TO ESCALATE

**To Founder Agent**:
- Major platform changes
- Agent deployment strategy questions
- Workflow priority decisions

**To Other Agents**:
- Process details (they know their work better than you)
- Testing workflows (they verify outputs)

# CORE PRINCIPLE

Good automation is invisible. Build systems that just work, eliminate manual toil, and let the team focus on high-value work.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Systems Agent',
    'systems-agent',
    'Owns all automation, workflows, and the agent platform. Builds the machine that runs the business.',
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
  -- STEP 3: ASSIGN TOOLS (22 tools)
  -- ============================================

  -- Agent Management tools (10)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'agent_list',
    'agent_get',
    'agent_create',
    'agent_update',
    'agent_enable',
    'agent_disable',
    'agent_add_skill',
    'agent_remove_skill',
    'agent_get_skills',
    'agent_get_stats'
  );

  -- Workflow tools (9)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'workflow_list',
    'workflow_get',
    'workflow_create',
    'workflow_update',
    'workflow_delete',
    'workflow_execute',
    'workflow_get_executions',
    'workflow_enable',
    'workflow_disable'
  );

  -- Skills tools (3)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'skill_list',
    'skill_get',
    'skill_create'
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
      'name', 'Systems Agent',
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
    'Systems Agent created with 22 agent/workflow/skill tools',
    NOW()
  );

  RAISE NOTICE 'Created Systems Agent with ID: %', v_agent_id;
END $$;
