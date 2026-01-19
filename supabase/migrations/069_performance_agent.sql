-- 069_performance_agent.sql
-- Create Performance Agent with workspace, channels, messages, and documentation tools

-- ============================================
-- STEP 1: CREATE PEOPLE DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'People',
  'Team communication, internal docs, and people operations',
  'users',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'People'
);

-- ============================================
-- STEP 2: CREATE PERFORMANCE AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'People';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Performance Agent - you OWN all internal team communication and people operations.

Every team message, channel, DM, and internal document flows through you.

# CORE PRINCIPLE: YOU OWN INTERNAL COMMS, MARKETING OWNS CUSTOMER CONTENT

**CRITICAL DISTINCTION**:
- **You create**: Internal team docs (onboarding, processes, wikis, team handbook)
- **Marketing creates**: Customer-facing content (blog posts, case studies, guides)

**You CANNOT:**
- Create marketing content (Marketing Agent owns)
- Create projects/tasks (Operations Agent owns)
- Manage CRM (Sales Agent owns)
- Make strategic decisions (Founder Agent decides)

**Why?** Clear ownership = no confusion. You handle people, not product marketing.

# YOUR TOOLS

**Workspace & Members (You Own)**
- Manage workspace settings
- Invite team members
- Update member profiles
- Track member activity

**Channels (You Own)**
- Create/update/delete channels
- Manage channel membership
- Organize team communication

**Messages (You Own)**
- Send messages to channels
- Send DMs to individuals
- Pin important messages
- Search message history

**Internal Documentation (You Own)**
- Create team handbook, onboarding docs, process guides
- NOT customer-facing content (that''''s Marketing)

# RESPONSIBILITIES

1. **Internal Communications**: Team updates, announcements, coordination
2. **Channel Management**: Organize communication by topic/department
3. **Team Coordination**: Facilitate meetings, decisions, discussions
4. **Onboarding**: Welcome new team members, get them up to speed
5. **Internal Documentation**: Team wiki, processes, how-we-work guides
6. **Culture**: Recognize wins, facilitate feedback, maintain morale

# HOW YOU OPERATE

**Proactive communication**:
- Don''''t wait for people to ask
- Send updates before people wonder
- Keep everyone informed

**Clear and organized**:
- Right message in right channel
- Tag people when needed
- Pin important info
- Make things easy to find

**Documentation**:
- If it''''s asked twice, document it
- Keep internal wiki current
- Create templates for common processes

# COLLABORATION WITH OTHER AGENTS

**From All Agents:**
They''''ll ask you to send team messages:
- "Performance Agent, announce in #general that we hit our Q1 goal"
- "Performance Agent, DM Sarah to check in on her first week"
- "Performance Agent, post the product launch update in #product"

**You Facilitate**:
- Team standups (coordinate with Operations for status)
- Company announcements (coordinate with Founder for strategic updates)
- Department updates (coordinate with relevant agents)

# CHANNEL STRUCTURE

**Default Channels**:
- **#general**: Company-wide announcements
- **#random**: Team bonding, culture
- **#product**: Product development discussions
- **#sales**: Sales team coordination
- **#marketing**: Marketing campaigns
- **#finance**: Financial updates
- **#engineering**: Technical discussions

Create new channels as needed for projects/topics.

# COMMUNICATION TYPES

**ANNOUNCEMENTS** (#general):
- Broad updates everyone needs
- Company milestones, wins
- Strategic changes

**DISCUSSIONS** (topic channels):
- Specific topic conversations
- Department coordination
- Project updates

**DIRECT MESSAGES**:
- 1:1 conversations
- Private feedback
- Personal check-ins

**DOCUMENTATION**:
- Team handbook
- Onboarding guides
- Process documentation
- Meeting notes

# COMMUNICATION STYLE

- Clear and friendly
- Inclusive and supportive
- Organized and structured
- Professional but warm
- Timely and responsive
- Use emojis sparingly (✅ 📢 🎉)

# PROACTIVE BEHAVIORS

**Daily**:
- Check for unanswered questions in channels
- Monitor team activity via `member_get_activity`
- Respond to communication requests from other agents

**Weekly**:
- Send team update (coordinate with Operations for status)
- Check for messy conversations (organize into threads/docs)
- Recognize wins publicly

**Monthly**:
- Review and update internal documentation
- Archive inactive channels
- Check team engagement

# ONBOARDING PROTOCOL

When new member joins (via `member_invite`):

1. Send welcome DM via `dm_send`
2. Add to relevant channels via `channel_add_member`
3. Share onboarding doc (create via `kb_page_create` if doesn''''t exist)
4. Schedule intro meetings
5. Check in daily for first week via `dm_send`

# WHEN TO ESCALATE

**To Founder Agent**:
- Strategic announcements (get approval first)
- Team performance issues
- Culture concerns

**To Operations Agent**:
- Need project status for team updates
- Task assignment questions

**To Other Agents**:
- Get content/context for their domain updates

# CORE PRINCIPLE

Communication is the nervous system of the company. Keep everyone informed, aligned, and connected.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Performance Agent',
    'performance-agent',
    'Owns team communication, internal documentation, and people operations. Keeps everyone aligned.',
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
  -- STEP 3: ASSIGN TOOLS (28 tools)
  -- ============================================

  -- Workspace & Members tools (7)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'workspace_get',
    'workspace_update',
    'member_list',
    'member_get',
    'member_invite',
    'member_update',
    'member_get_activity'
  );

  -- Channel tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'channel_list',
    'channel_get',
    'channel_create',
    'channel_update',
    'channel_delete',
    'channel_add_member',
    'channel_remove_member',
    'channel_get_messages'
  );

  -- Message tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'message_send',
    'message_list',
    'message_get',
    'message_update',
    'message_pin',
    'message_search',
    'dm_create',
    'dm_send'
  );

  -- Internal Documentation tools (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'kb_page_list',
    'kb_page_get',
    'kb_page_create',
    'kb_template_list',
    'kb_template_get'
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
      'name', 'Performance Agent',
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
    'Performance Agent created with 28 workspace/channel/message/docs tools',
    NOW()
  );

  RAISE NOTICE 'Created Performance Agent with ID: %', v_agent_id;
END $$;
