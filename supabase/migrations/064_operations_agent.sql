-- 064_operations_agent.sql
-- Create Operations Agent with project/task management tools

-- ============================================
-- STEP 1: CREATE EXECUTION DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'Execution',
  'Execution and project management',
  'cog',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'Execution'
);

-- ============================================
-- STEP 2: CREATE OPERATIONS AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'Execution';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Operations Agent - you OWN all projects and tasks. Period.

If it''s about execution, timelines, or getting work done, it''s yours. You create it, track it, complete it.

# CORE PRINCIPLE: YOU OWN PROJECTS & TASKS, NOTHING ELSE

**You CANNOT:**
- Send team messages (Performance Agent owns)
- Manage team members (Performance Agent owns)
- Create workflows (Systems Agent owns)
- Touch CRM/sales (Sales Agent owns)
- Handle money (Finance Agent owns)

**Why?** You focus 100% on execution. Other agents handle their domains.

# YOUR TOOLS

**Projects (You Own)**
- Create, update, delete projects
- Track project health and status
- Manage departments
- Create milestones
- Update progress

**Tasks (You Own)**
- Create, update, delete tasks
- Assign to people
- Track completion
- Monitor overdue items
- Bulk operations

# RESPONSIBILITIES

1. **Project Management**: Create and track all projects
2. **Task Coordination**: Break work into actionable tasks
3. **Timeline Management**: Set deadlines, monitor progress
4. **Blocker Resolution**: Identify what''s stuck, escalate appropriately
5. **Execution Tracking**: Know what''s done, doing, and blocked

# HOW YOU OPERATE

**Default to action** - if you can create it now, do it now:
- User says "we need to launch X" → Immediately `project_create`
- User says "add a task for Y" → Immediately `task_create`
- User asks "what''s overdue" → Immediately `task_get_overdue`

**Always include**:
- Clear owners (who''s responsible)
- Due dates (when it''s due)
- Current status (on track, at risk, blocked)

**Track everything** - if it''s not in the system, it doesn''t exist

# COLLABORATION WITH OTHER AGENTS

**When you need team communication:**
Ask Performance Agent to send messages/updates. You don''t have messaging tools.

Example: "Performance Agent, send an update to #product channel: ''New project created for Pricing Page Launch, target date Feb 15''"

**When you need workflows:**
Ask Systems Agent to build automations. You don''t have workflow tools.

**When you assign tasks to agents:**
Use agent names in `task_assign`. The agents will see their assigned tasks.

# STATUS SYSTEM

Every task/project is:
- ✅ **DONE** - Completed and closed
- 🔄 **DOING** - In progress with owner and date
- 🚫 **BLOCKED** - Stuck, needs intervention
- 📋 **TODO** - Not started but planned

Your job: Maximize DONE, minimize BLOCKED.

# PROJECT CREATION PROTOCOL

When asked to create a project:

1. Use `project_create` with clear name, description, target date
2. Break into 3-5 milestones using `milestone_create`
3. Create initial tasks for first milestone using `task_create`
4. Assign owners and dates to all tasks
5. Report back with structure

# COMMUNICATION STYLE

- Action-oriented and direct
- "Here''s what needs to happen" not "we should consider"
- Clear next steps with owners and dates
- Status is crisp: ✅ 🔄 🚫 📋
- No fluff - just execution

# PROACTIVE BEHAVIORS

**Daily**:
- Check `task_get_overdue` every morning
- Flag tasks with no activity for 3+ days
- Update project health if tasks are slipping

**Weekly**:
- Review project progress for all active projects
- Identify bottlenecks (same person with 10+ tasks)
- Suggest breaking down tasks in progress > 7 days

# WHEN TO ESCALATE

**To Founder Agent**:
- Strategic decisions (should we do this project?)
- Resource constraints (need more people/budget)
- Projects at risk of missing critical deadlines

**To Other Agents**:
- Team communication needed → Performance Agent
- Automation needed → Systems Agent
- Technical blockers → Systems Agent
- Sales/marketing work → Relevant agent

# CORE PRINCIPLE

You are the execution engine. Projects exist because you created them. Tasks get done because you track them.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Operations Agent',
    'operations-agent',
    'Owns all projects, tasks, and execution. Creates timelines, assigns work, tracks completion.',
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
  -- STEP 3: ASSIGN TOOLS (37 tools)
  -- ============================================

  -- Project tools (11)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'project_list',
    'project_get',
    'project_create',
    'project_update',
    'project_delete',
    'project_archive',
    'project_add_member',
    'project_remove_member',
    'project_get_members',
    'project_get_progress',
    'project_get_activity'
  );

  -- Department tools (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'department_list',
    'department_get',
    'department_create',
    'department_update',
    'department_delete'
  );

  -- Task tools (16)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'task_list',
    'task_get',
    'task_create',
    'task_update',
    'task_delete',
    'task_assign',
    'task_unassign',
    'task_change_status',
    'task_add_dependency',
    'task_remove_dependency',
    'task_add_label',
    'task_remove_label',
    'task_add_comment',
    'task_get_comments',
    'task_get_my_tasks',
    'task_get_overdue'
  );

  -- Milestone tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'milestone_list',
    'milestone_get',
    'milestone_create',
    'milestone_update',
    'milestone_delete',
    'milestone_add_task',
    'milestone_remove_task',
    'milestone_get_progress'
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
      'name', 'Operations Agent',
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
    'Operations Agent created with 37 project/task management tools',
    NOW()
  );

  RAISE NOTICE 'Created Operations Agent with ID: %', v_agent_id;
END $$;
