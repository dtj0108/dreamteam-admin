# Scheduled Task Team Notifications

This document explains how scheduled tasks notify team members in the dreamteam.ai platform.

## Overview

When AI agents complete scheduled tasks, the system notifies relevant team members through **in-app agent chat messages** (not SMS or email). This allows team members to see task results directly in the agent's chat interface under the Agents section.

### Key Concepts

- **Scheduled Tasks**: Configured via cron expressions, stored in `agent_schedules` table
- **Task Execution**: Processed by cron endpoint every minute via Vercel Cron
- **Team Notifications**: Delivered as in-app messages in the agent conversation UI
- **Recipient Resolution**: Cascading priority system to ensure someone always gets notified

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCHEDULED TASK NOTIFICATION FLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Vercel Cron     │  Triggers every minute
    │  (External)      │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  GET /api/cron/  │  Cron endpoint with CRON_SECRET auth
    │  check-schedules │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Schedule        │  Finds schedules where:
    │  Processor       │  - is_enabled = true
    │                  │  - next_run_at <= NOW()
    └────────┬─────────┘
             │
             ├─────────────────────────────────┐
             │                                 │
             ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │  Create          │              │  Update Schedule │
    │  Execution       │              │  next_run_at     │
    │  Record          │              │  (via croner)    │
    └────────┬─────────┘              └──────────────────┘
             │
             ▼
    ┌──────────────────┐
    │  Agent Executor  │  Uses AI SDK v6 + Anthropic
    │  (generateText)  │  - System prompt from agent/ai_agent
    │                  │  - Task prompt from schedule
    │                  │  - Tools from local agent config
    └────────┬─────────┘
             │
             ├──────────────┬──────────────────┐
             │              │                  │
             ▼              ▼                  ▼
    ┌───────────────┐ ┌────────────┐  ┌──────────────────┐
    │  Update       │ │  Resolve   │  │  Format          │
    │  Execution    │ │  Recipient │  │  Completion      │
    │  (completed/  │ │  (cascade) │  │  Message         │
    │  failed)      │ │            │  │                  │
    └───────────────┘ └──────┬─────┘  └────────┬─────────┘
                             │                 │
                             ▼                 │
                    ┌──────────────────┐       │
                    │  Recipient       │       │
                    │  Priority:       │       │
                    │  1. reports_to   │       │
                    │  2. created_by   │       │
                    │  3. ws admins    │       │
                    │  4. ws owner     │       │
                    └────────┬─────────┘       │
                             │                 │
                             └────────┬────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────┐
                    │  Send Agent Chat Message     │
                    │  - Find/create conversation  │
                    │  - Insert agent_messages     │
                    │    with role='assistant'     │
                    └──────────────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────┐
                    │  User sees message in        │
                    │  /agents/{agentId}/chat      │
                    │  "Scheduled Tasks" convo     │
                    └──────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `agent_schedules`

Defines when and what tasks agents should run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to `ai_agents` (global agent definition) |
| `name` | string | Human-readable schedule name |
| `cron_expression` | string | Cron schedule (e.g., `0 9 * * 1-5`) |
| `timezone` | string | Timezone (e.g., `America/New_York`) |
| `task_prompt` | string | The prompt/task the agent executes |
| `requires_approval` | boolean | Whether execution needs approval first |
| `is_enabled` | boolean | Whether schedule is active |
| `last_run_at` | timestamp | When last executed |
| `next_run_at` | timestamp | When next execution is due |
| `created_by` | UUID | Profile ID of user who created the schedule |

#### `agent_schedule_executions`

Tracks each execution of a scheduled task.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `schedule_id` | UUID | FK to `agent_schedules` |
| `agent_id` | UUID | FK to `ai_agents` |
| `scheduled_for` | timestamp | Originally scheduled time |
| `status` | enum | `pending_approval`, `approved`, `running`, `completed`, `failed` |
| `approved_by` | UUID | Who approved (if requires_approval) |
| `started_at` | timestamp | When execution started |
| `completed_at` | timestamp | When execution finished |
| `result` | jsonb | `{ text: "..." }` - AI response |
| `tool_calls` | jsonb[] | Tools invoked during execution |
| `error_message` | string | Error if status is `failed` |
| `tokens_input` | number | Prompt tokens used |
| `tokens_output` | number | Completion tokens used |
| `duration_ms` | number | Total execution time |

#### `agents` (Local Agent)

Workspace-specific agent configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (local agent ID) |
| `ai_agent_id` | UUID | FK to `ai_agents` (global) |
| `workspace_id` | UUID | FK to `workspaces` |
| `tools` | string[] | Enabled tools for this agent |
| `system_prompt` | string | Custom prompt (overrides ai_agent) |
| `reports_to` | UUID[] | **User IDs who receive notifications** |
| `profile_id` | UUID | Agent's profile for messaging |
| `is_active` | boolean | Whether agent is active |
| `created_by` | UUID | Who created this agent |

#### `agent_conversations`

Chat sessions between users and agents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to local `agents` table |
| `workspace_id` | UUID | FK to `workspaces` |
| `user_id` | UUID | FK to `profiles` (the recipient) |
| `title` | string | Conversation title (e.g., "Scheduled Tasks") |
| `created_at` | timestamp | When created |
| `updated_at` | timestamp | Last message time |

#### `agent_messages`

Individual messages in agent conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | FK to `agent_conversations` |
| `role` | enum | `user` or `assistant` |
| `content` | string | Message text |
| `parts` | jsonb | AI SDK message parts |
| `created_at` | timestamp | When sent |

---

## Scheduling System

### How Schedules Are Configured

Schedules are created in the admin panel and linked to AI agents. Each schedule defines:

1. **Agent**: Which AI agent runs the task
2. **Cron Expression**: When to run (standard cron syntax)
3. **Timezone**: For accurate local-time scheduling
4. **Task Prompt**: What the agent should do
5. **Approval Required**: Whether tasks need manual approval

### Cron Processing

The cron endpoint (`/api/cron/check-schedules`) runs every minute via Vercel Cron:

```typescript
// Simplified flow from schedule-processor.ts
export async function processAgentSchedules() {
  // 1. Find due schedules
  const dueSchedules = await supabase
    .from("agent_schedules")
    .select("*, ai_agent:ai_agents(*)")
    .eq("is_enabled", true)
    .lte("next_run_at", now)
    .limit(50)

  for (const schedule of dueSchedules) {
    // 2. Find local agent for workspace context
    const localAgent = await supabase
      .from("agents")
      .select("id, workspace_id, tools, system_prompt, reports_to")
      .eq("ai_agent_id", schedule.agent_id)
      .single()

    // 3. Create execution record
    const execution = await supabase
      .from("agent_schedule_executions")
      .insert({
        schedule_id: schedule.id,
        status: schedule.requires_approval ? "pending_approval" : "running",
      })

    // 4. Update next_run_at using croner
    const nextRun = new Cron(schedule.cron_expression, {
      timezone: schedule.timezone
    }).nextRun()

    await supabase
      .from("agent_schedules")
      .update({ next_run_at: nextRun, last_run_at: now })

    // 5. Execute if no approval required
    if (!schedule.requires_approval) {
      await runExecution(execution.id, schedule, localAgent)
    }
  }
}
```

---

## Task Execution

### The Agent Executor

Tasks are executed using the AI SDK v6 with Anthropic's Claude:

```typescript
// From agent-executor.ts
export async function executeAgentTask(params: ExecuteParams) {
  const tools = buildAgentTools(params.tools, context)

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.taskPrompt }],
    tools,
    stopWhen: stepCountIs(10),  // Max 10 tool-use steps
  })

  return {
    text: result.text,
    toolCalls: extractToolCalls(result.steps),
    usage: result.usage,
    durationMs: Date.now() - startTime,
  }
}
```

### Execution States

| Status | Description |
|--------|-------------|
| `pending_approval` | Awaiting manual approval |
| `approved` | Approved, waiting to run |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Error during execution |

---

## Notification System

### How Team Members Receive Notifications

After task completion (success or failure), the system sends an **in-app agent chat message**:

1. **Find/Create Conversation**: Looks for existing `agent_conversations` row for this agent+user pair
2. **Insert Message**: Creates `agent_messages` row with `role='assistant'`
3. **Update Timestamp**: Bumps `updated_at` on conversation

The user sees the message in their agent chat interface at `/agents/{agentId}/chat`.

### Message Delivery Code

```typescript
// From agent-messaging.ts
export async function sendAgentChatMessage(params) {
  // 1. Find or create conversation
  let conversation = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('agent_id', params.agentId)
    .eq('user_id', params.userId)
    .single()

  if (!conversation) {
    conversation = await supabase
      .from('agent_conversations')
      .insert({
        agent_id: params.agentId,
        user_id: params.userId,
        workspace_id: params.workspaceId,
        title: 'Scheduled Tasks',
      })
  }

  // 2. Insert message as assistant
  await supabase
    .from('agent_messages')
    .insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: params.content,
      parts: [{ type: 'text', text: params.content }],
    })
}
```

---

## Recipient Resolution

The system uses a **cascading priority** to determine who receives notifications. This ensures someone always gets notified, even if the primary recipient isn't configured.

### Priority Order

```
1. agent.reports_to     →  Array of user IDs explicitly configured
2. schedule.created_by  →  User who created the schedule
3. workspace admins     →  Users with 'owner' or 'admin' role
4. workspace owner      →  Single owner as final fallback
```

### Resolution Logic

```typescript
// From schedule-processor.ts
let recipientIds: string[] = []
let recipientSource: string = 'none'

// 1. Check reports_to first (highest priority)
if (localAgent.reports_to && localAgent.reports_to.length > 0) {
  recipientIds = localAgent.reports_to
  recipientSource = 'reports_to'
}
// 2. Fall back to schedule creator
else if (notifyUserId) {
  recipientIds = [notifyUserId]
  recipientSource = 'notifyUserId'
}
// 3. Fall back to workspace admins
else {
  recipientIds = await getWorkspaceAdminIds(localAgent.workspace_id, supabase)
  recipientSource = 'workspaceAdmins'

  // 4. Final fallback: workspace owner
  if (recipientIds.length === 0) {
    const ownerId = await getWorkspaceOwnerId(localAgent.workspace_id, supabase)
    if (ownerId) {
      recipientIds = [ownerId]
      recipientSource = 'workspaceOwner'
    }
  }
}
```

### Helper Functions

```typescript
// Get all admins (owners + admins) in a workspace
async function getWorkspaceAdminIds(workspaceId, supabase) {
  const { data: admins } = await supabase
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)
    .in("role", ["owner", "admin"])

  return admins.map(a => a.profile_id)
}

// Get the workspace owner specifically
async function getWorkspaceOwnerId(workspaceId, supabase) {
  const { data: owner } = await supabase
    .from("workspace_members")
    .select("profile_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .single()

  return owner?.profile_id
}
```

---

## Message Formatting

### Completion Messages

```typescript
// From agent-messaging.ts
export function formatTaskCompletionMessage(params) {
  const { scheduleName, taskPrompt, status, resultText, durationMs } = params

  if (status === "completed") {
    const truncatedResult = resultText.length > 500
      ? `${resultText.slice(0, 500)}...`
      : resultText
    const durationStr = durationMs
      ? `\n\n_Completed in ${(durationMs / 1000).toFixed(1)}s_`
      : ""

    return `**Scheduled Task Completed**

I finished running your scheduled task: **${scheduleName}**

**Task:** ${taskPrompt}

**Result:** ${truncatedResult}${durationStr}`
  }

  // Failure message
  return `**Scheduled Task Failed**

I encountered an error running: **${scheduleName}**

**Task:** ${taskPrompt}

**Error:** ${resultText}`
}
```

### Example Messages

**Success:**
```
**Scheduled Task Completed**

I finished running your scheduled task: **Daily Lead Follow-up**

**Task:** Review all leads from yesterday and send follow-up emails

**Result:** I reviewed 12 leads from yesterday. 8 were already contacted,
3 received follow-up emails, and 1 was marked as unqualified due to
missing contact information.

_Completed in 4.2s_
```

**Failure:**
```
**Scheduled Task Failed**

I encountered an error running: **Daily Lead Follow-up**

**Task:** Review all leads from yesterday and send follow-up emails

**Error:** Failed to connect to email service: SMTP timeout after 30s
```

---

## Key Code References

| File | Purpose |
|------|---------|
| `apps/finance/src/lib/schedule-processor.ts` | Core scheduling logic, execution, notification delivery |
| `apps/finance/src/lib/agent-messaging.ts` | Message formatting, sending chat messages |
| `apps/finance/src/lib/agent-executor.ts` | AI task execution using AI SDK |
| `apps/finance/src/app/api/cron/check-schedules/route.ts` | Cron endpoint triggered by Vercel |
| `supabase/migrations/074_add_agent_profiles.sql` | Agent profiles for messaging |
| `supabase/migrations/075_add_agent_reports_to.sql` | Reports-to array column |
| `supabase/migrations/038_create_agent_conversations.sql` | Agent chat tables |

---

## Configuration Guide

### Setting Up `reports_to`

The `reports_to` field is the primary way to configure who receives notifications:

1. **Via Admin Panel**: Edit the agent and add user IDs to the reports_to array
2. **Via API**: Update the `agents` table directly

```sql
-- Set a single recipient
UPDATE agents
SET reports_to = ARRAY['user-uuid-here']
WHERE id = 'agent-id';

-- Set multiple recipients
UPDATE agents
SET reports_to = ARRAY['user-1-uuid', 'user-2-uuid']
WHERE id = 'agent-id';
```

### Creating Schedules

Schedules are created in the admin schema (`agent_schedules`):

```sql
INSERT INTO agent_schedules (
  agent_id,
  name,
  cron_expression,
  timezone,
  task_prompt,
  requires_approval,
  is_enabled,
  next_run_at,
  created_by
) VALUES (
  'ai-agent-uuid',
  'Daily Lead Follow-up',
  '0 9 * * 1-5',           -- 9 AM weekdays
  'America/New_York',
  'Review all leads from yesterday and send follow-up emails',
  false,                    -- Run immediately without approval
  true,                     -- Active
  '2024-01-24T09:00:00Z',  -- First run
  'creator-profile-uuid'
);
```

### Common Cron Expressions

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Daily at 9 AM |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 */2 * * *` | Every 2 hours |
| `0 0 1 * *` | First of each month |
| `*/15 * * * *` | Every 15 minutes |

### Testing Scheduled Tasks

Use the test mode endpoint to manually trigger a schedule:

```bash
# Trigger the first enabled schedule
curl "http://localhost:3001/api/cron/check-schedules?test=true"

# Trigger with offset to select different schedules
curl "http://localhost:3001/api/cron/check-schedules?test=true&offset=1"
```

The response includes debugging information:
- `recipientIds`: Who received the notification
- `source`: How recipients were resolved (`reports_to`, `created_by`, etc.)
- `messaging.results`: Success/failure for each recipient

---

## Troubleshooting

### "No recipients found" Warning

If you see this in logs, check:
1. Does the agent have `reports_to` configured?
2. Does the schedule have a `created_by` value?
3. Does the workspace have any admins or owners?

### Messages Not Appearing

1. Verify the agent has a `profile_id` (required for conversations)
2. Check `agent_conversations` table for the conversation
3. Check `agent_messages` table for the message

### Execution Not Running

1. Check `is_enabled` is `true` on both schedule and agent
2. Verify `next_run_at` is in the past
3. Check cron endpoint logs for errors
