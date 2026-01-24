# Scheduled Task Test System

This document explains how the scheduled task test system works in the DreamTeam admin panel, including its architecture, UI components, API endpoints, and execution flows.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [UI Components](#ui-components)
4. [API Endpoints](#api-endpoints)
5. [Execution Flow](#execution-flow)
6. [Database Schema](#database-schema)
7. [Agent Runtime Integration](#agent-runtime-integration)
8. [Key Features](#key-features)

---

## Overview

The scheduled task test system allows administrators to:

- **Test scheduled agent executions** before they run automatically
- **Validate cron expressions** with human-readable descriptions
- **Review and approve/reject** executions that require approval
- **Monitor execution results** including token usage, costs, and tool calls

### Purpose

Scheduled tasks enable AI agents to perform recurring work (e.g., daily reports, weekly summaries) without manual intervention. The test system provides a way to:

1. Manually trigger schedules to verify they work correctly
2. Review pending executions before they run
3. Inspect detailed results including response content, tool calls, and todos

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Admin Panel UI                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ ScheduleTestPanel│  │  CronValidator   │  │  ExecutionDetails    │  │
│  │                  │  │                  │  │                      │  │
│  │ - Workspace sel. │  │ - Cron input     │  │ - Status badges      │  │
│  │ - Schedule sel.  │  │ - Presets        │  │ - Metrics display    │  │
│  │ - Run Test btn   │  │ - Validation     │  │ - Tabbed content:    │  │
│  │ - Run All btn    │  │ - Next runs      │  │   Response, Tools,   │  │
│  │ - Results list   │  │                  │  │   Todos, Raw JSON    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │               │
└───────────┼─────────────────────┼───────────────────────┼───────────────┘
            │                     │                       │
            ▼                     ▼                       │
┌───────────────────────────────────────────────────────────────────────────┐
│                            API Layer                                       │
├───────────────────────────────────────────────────────────────────────────┤
│  POST /api/admin/agents/[id]/schedules/[scheduleId]/run                   │
│  POST /api/admin/cron/validate                                            │
│  GET  /api/admin/schedules                                                │
│  GET  /api/admin/scheduled-tasks                                          │
│  POST /api/admin/scheduled-tasks/[executionId]/approve                    │
│  POST /api/admin/scheduled-tasks/[executionId]/reject                     │
└───────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         Agent Runtime                                      │
├───────────────────────────────────────────────────────────────────────────┤
│  runScheduledExecution()  →  runAgentById()  →  runAgent()                │
│       │                           │                  │                     │
│       │                           │                  ▼                     │
│       │                           │         Anthropic API Call             │
│       │                           │                  │                     │
│       ▼                           ▼                  ▼                     │
│  Update DB Status         Fetch Agent Config     Tool Calls via MCP        │
└───────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           Supabase Database                                │
├───────────────────────────────────────────────────────────────────────────┤
│  agent_schedules  │  agent_schedule_executions  │  ai_agents              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### ScheduleTestPanel

**Location:** `src/components/admin/schedule-test-panel.tsx`

A collapsible card component that provides the main test interface.

#### Features

| Feature | Description |
|---------|-------------|
| **Workspace Context Selector** | Dropdown to select a workspace. The selected workspace ID is passed to agent tools during execution. |
| **Schedule Selector** | Dropdown listing all available schedules with their associated agent names. |
| **Run Test Button** | Executes the selected schedule and displays results. |
| **Run All Button** | Sequentially executes all schedules and displays aggregated results. |
| **Test Results Display** | Expandable list showing pass/fail status, duration, token usage, and cost for each test. |

#### Props

```typescript
interface ScheduleTestPanelProps {
  schedules: Schedule[]      // List of available schedules
  onRefresh?: () => void     // Callback after test completes
}
```

#### Key State

```typescript
const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
const [testResults, setTestResults] = useState<TestResult[]>([])
```

---

### CronValidator

**Location:** `src/components/admin/cron-validator.tsx`

A component for validating cron expressions with real-time feedback.

#### Features

| Feature | Description |
|---------|-------------|
| **Cron Input** | Text field for entering custom cron expressions |
| **Presets Dropdown** | Quick selection for common schedules (Daily, Weekly, Monthly, etc.) |
| **Timezone Display** | Shows the timezone used for scheduling |
| **Validation Button** | Triggers server-side validation |
| **Results Display** | Shows valid/invalid status, human-readable description, field breakdown, and next run times |

#### Props

```typescript
interface CronValidatorProps {
  initialExpression?: string        // Pre-populated expression
  timezone?: string                 // Default: 'America/New_York'
  onChange?: (expression: string, isValid: boolean) => void
  compact?: boolean                 // Reduced UI mode
}
```

#### Schedule Presets

```typescript
const SCHEDULE_PRESETS = [
  { label: 'Daily',     cron: '0 9 * * *',       description: 'Every day at 9:00 AM' },
  { label: 'Weekly',    cron: '0 9 * * 1',       description: 'Every Monday at 9:00 AM' },
  { label: 'Monthly',   cron: '0 9 1 * *',       description: '1st of each month at 9:00 AM' },
  { label: 'Quarterly', cron: '0 9 1 1,4,7,10 *', description: 'Jan, Apr, Jul, Oct 1st at 9:00 AM' },
  { label: 'Custom',    cron: '',                description: 'Define your own schedule' }
]
```

---

### ExecutionDetails

**Location:** `src/components/admin/execution-details.tsx`

A detailed view component for displaying execution results.

#### Features

| Feature | Description |
|---------|-------------|
| **Status Badge** | Color-coded badge showing execution status |
| **Metrics Grid** | Duration, input/output tokens, and USD cost |
| **Timestamps** | Scheduled time, start time, and completion time |
| **Task Prompt** | The prompt that was sent to the agent |
| **Error Display** | Red-highlighted error message if execution failed |
| **Rejection Reason** | Displayed for rejected executions |
| **Tabbed Content** | Four tabs for different views of the results |

#### Tabs

1. **Response** - The agent's final text response
2. **Tool Calls** - List of tools invoked with their inputs/outputs
3. **Todos** - Task items created by the agent (via TodoWrite tool)
4. **Raw JSON** - Complete execution data with copy-to-clipboard

#### Status Badges

```typescript
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending_approval': return <Badge>Pending</Badge>    // Yellow
    case 'approved':         return <Badge>Approved</Badge>   // Blue
    case 'rejected':         return <Badge>Rejected</Badge>   // Red
    case 'running':          return <Badge>Running</Badge>    // Blue with spinner
    case 'completed':        return <Badge>Completed</Badge>  // Green
    case 'failed':           return <Badge>Failed</Badge>     // Red
  }
}
```

---

## API Endpoints

### POST `/api/admin/agents/[id]/schedules/[scheduleId]/run`

**Location:** `src/app/api/admin/agents/[id]/schedules/[scheduleId]/run/route.ts`

Manually triggers a schedule execution.

#### Request Body

```typescript
{
  workspace_id?: string  // Optional workspace context
}
```

#### Response

```typescript
{
  execution: AgentScheduleExecution,
  message: string,
  error?: string,
  usage?: {
    inputTokens: number,
    outputTokens: number,
    cost?: TokenCost
  }
}
```

#### Behavior

1. Fetches schedule from `agent_schedules`
2. Creates execution record in `agent_schedule_executions`
3. If `requires_approval` is true:
   - Sets status to `pending_approval`
   - Returns immediately
4. If approval not required:
   - Sets status to `running`
   - Calls `runScheduledExecution()`
   - Updates execution with results
   - Updates `last_run_at` on schedule

---

### POST `/api/admin/cron/validate`

**Location:** `src/app/api/admin/cron/validate/route.ts`

Validates a cron expression and returns parsing details.

#### Request Body

```typescript
{
  cron_expression: string,
  timezone?: string,    // Default: 'America/New_York'
  count?: number        // Number of next runs to return (default: 5, max: 10)
}
```

#### Response (Valid)

```typescript
{
  valid: true,
  expression: "0 9 * * 1",
  description: "Every Monday at 9:00 AM",
  timezone: "America/New_York",
  next_runs: [
    "2025-01-27T14:00:00.000Z",
    "2025-02-03T14:00:00.000Z",
    // ...
  ],
  fields: {
    minute: "0",
    hour: "9",
    day_of_month: "*",
    month: "*",
    day_of_week: "1"
  }
}
```

#### Response (Invalid)

```typescript
{
  valid: false,
  expression: "invalid",
  error: "Invalid cron field value",
  hint: "Cron format: minute hour day of month month day of week"
}
```

---

### GET `/api/admin/schedules`

**Location:** `src/app/api/admin/schedules/route.ts`

Lists all schedules with their associated agent information.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `enabled` | `"true"` | Only return enabled schedules |
| `agent_id` | `string` | Filter by specific agent |

#### Response

```typescript
{
  schedules: Array<{
    id: string,
    name: string,
    description: string | null,
    agent_id: string,
    cron_expression: string,
    timezone: string,
    task_prompt: string,
    is_enabled: boolean,
    requires_approval: boolean,
    next_run_at: string | null,
    last_run_at: string | null,
    agent: {
      id: string,
      name: string,
      is_enabled: boolean,
      avatar_url: string | null
    }
  }>
}
```

---

### GET `/api/admin/scheduled-tasks`

**Location:** `src/app/api/admin/scheduled-tasks/route.ts`

Lists execution records with optional filtering.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `string` | Filter by status (default: `pending_approval`). Use `all` for no filter. |
| `agent_id` | `string` | Filter by specific agent |
| `limit` | `number` | Max records to return (default: 50) |

#### Response

```typescript
{
  executions: Array<AgentScheduleExecution & {
    schedule: { id, name, task_prompt, cron_expression },
    agent: { id, name, avatar_url }
  }>
}
```

---

### POST `/api/admin/scheduled-tasks/[executionId]/approve`

**Location:** `src/app/api/admin/scheduled-tasks/[executionId]/approve/route.ts`

Approves a pending execution and runs it immediately.

#### Behavior

1. Validates execution exists and status is `pending_approval`
2. Checks that the agent is enabled
3. Updates status to `running` with `approved_by` and `approved_at`
4. Calls `runAgentById()` to execute the task
5. Updates execution with results (status, result, tool_calls, tokens, etc.)
6. Logs admin action via `logAdminAction()`

#### Response

```typescript
{
  execution: AgentScheduleExecution,
  message: "Execution approved and completed",
  usage: { inputTokens, outputTokens }
}
```

---

### POST `/api/admin/scheduled-tasks/[executionId]/reject`

**Location:** `src/app/api/admin/scheduled-tasks/[executionId]/reject/route.ts`

Rejects a pending execution.

#### Request Body

```typescript
{
  reason?: string  // Optional rejection reason
}
```

#### Behavior

1. Validates execution exists and status is `pending_approval`
2. Updates status to `rejected` with reason
3. Logs admin action

#### Response

```typescript
{
  execution: AgentScheduleExecution,
  message: "Execution rejected"
}
```

---

## Execution Flow

### Manual Test Flow

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│ Admin clicks │────▶│ POST /run       │────▶│ Create execution record │
│ "Run Test"   │     │                 │     │ status: 'running'       │
└──────────────┘     └─────────────────┘     └───────────┬─────────────┘
                                                         │
                                                         ▼
                     ┌─────────────────┐     ┌─────────────────────────┐
                     │ runScheduled-   │◀────│ Build workspace context │
                     │ Execution()     │     │ (if workspace selected) │
                     └────────┬────────┘     └─────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐     ┌─────────────────────────┐
                     │ runAgentById()  │────▶│ Fetch agent config from │
                     │                 │     │ database (tools, skills │
                     └────────┬────────┘     │ mind, rules, etc.)      │
                              │              └─────────────────────────┘
                              ▼
                     ┌─────────────────┐
                     │ runAgent()      │     Multi-turn agent loop
                     │                 │     with Anthropic API
                     └────────┬────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Tool calls   │   │ TodoWrite    │   │ Text response│
    │ via MCP      │   │ handling     │   │              │
    └──────────────┘   └──────────────┘   └──────────────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                     ┌─────────────────┐
                     │ Update DB with  │
                     │ results, tokens │
                     │ status: complete│
                     └─────────────────┘
```

### Approval Flow

```
Schedule with         ┌─────────────────┐     ┌─────────────────────────┐
requires_approval ───▶│ POST /run       │────▶│ Create execution record │
= true                │                 │     │ status: 'pending_approv'│
                      └─────────────────┘     └───────────┬─────────────┘
                                                          │
                                                          ▼
                                              ┌─────────────────────────┐
                                              │ Return to admin panel   │
                                              │ (execution not started) │
                                              └───────────┬─────────────┘
                                                          │
                                                          ▼
Admin reviews     ┌─────────────────────────────────────────────────────┐
on Scheduled      │ Scheduled Tasks Page                                │
Tasks page        │ - Shows pending executions                          │
                  │ - Admin clicks "Approve" or "Reject"                │
                  └───────────────────────┬─────────────────────────────┘
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              ▼                                                       ▼
     ┌─────────────────┐                                    ┌─────────────────┐
     │ POST /approve   │                                    │ POST /reject    │
     │                 │                                    │                 │
     │ 1. Set running  │                                    │ 1. Set rejected │
     │ 2. Run agent    │                                    │ 2. Store reason │
     │ 3. Save results │                                    │ 3. Log action   │
     └─────────────────┘                                    └─────────────────┘
```

---

## Database Schema

### `agent_schedules` Table

Stores schedule definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `agent_id` | `uuid` | References `ai_agents.id` |
| `name` | `text` | Schedule name |
| `description` | `text` | Optional description |
| `cron_expression` | `text` | Cron schedule (5 fields) |
| `timezone` | `text` | Timezone (default: America/New_York) |
| `task_prompt` | `text` | The prompt sent to the agent |
| `requires_approval` | `boolean` | Whether manual approval is needed |
| `output_config` | `jsonb` | Output configuration |
| `is_enabled` | `boolean` | Whether schedule is active |
| `last_run_at` | `timestamptz` | Last successful execution |
| `next_run_at` | `timestamptz` | Calculated next run time |
| `created_by` | `uuid` | Creator user ID |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last update timestamp |

### `agent_schedule_executions` Table

Stores individual execution records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `schedule_id` | `uuid` | References `agent_schedules.id` |
| `agent_id` | `uuid` | References `ai_agents.id` |
| `scheduled_for` | `timestamptz` | When execution was scheduled |
| `started_at` | `timestamptz` | When execution started |
| `completed_at` | `timestamptz` | When execution finished |
| `status` | `text` | Current status (see enum below) |
| `approved_by` | `uuid` | User who approved/rejected |
| `approved_at` | `timestamptz` | When approval action taken |
| `rejection_reason` | `text` | Reason for rejection |
| `result` | `jsonb` | `{ message, todos }` |
| `tool_calls` | `jsonb[]` | Array of tool call records |
| `error_message` | `text` | Error if execution failed |
| `tokens_input` | `integer` | Input tokens used |
| `tokens_output` | `integer` | Output tokens used |
| `cost_usd` | `decimal` | Calculated cost |
| `duration_ms` | `integer` | Execution duration |
| `created_at` | `timestamptz` | Record creation time |

### Status Lifecycle

```typescript
type ScheduleExecutionStatus =
  | 'pending_approval'  // Awaiting admin approval
  | 'approved'          // Approved but not yet started
  | 'rejected'          // Rejected by admin
  | 'running'           // Currently executing
  | 'completed'         // Successfully finished
  | 'failed'            // Execution failed
  | 'cancelled'         // Cancelled before execution
```

#### Status Transitions

```
                                  ┌──────────────┐
                                  │   created    │
                                  └──────┬───────┘
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            │ requires_approval = true   │ requires_approval = false  │
            ▼                            ▼                            │
    ┌───────────────┐            ┌───────────────┐                    │
    │pending_approval│            │   running     │◀───────────────────┘
    └───────┬───────┘            └───────┬───────┘
            │                            │
     ┌──────┴──────┐              ┌──────┴──────┐
     ▼             ▼              ▼             ▼
┌─────────┐  ┌─────────┐    ┌─────────┐   ┌─────────┐
│rejected │  │ running │───▶│completed│   │ failed  │
└─────────┘  └────┬────┘    └─────────┘   └─────────┘
                  │
           ┌──────┴──────┐
           ▼             ▼
     ┌─────────┐   ┌─────────┐
     │completed│   │ failed  │
     └─────────┘   └─────────┘
```

---

## Agent Runtime Integration

### Core Functions

**Location:** `src/lib/agent-runtime.ts`

#### `runScheduledExecution()`

Entry point for scheduled task execution.

```typescript
export async function runScheduledExecution(
  executionId: string,
  agentId: string,
  taskPrompt: string,
  context?: ScheduledExecutionContext
): Promise<AgentRunResult>
```

**Behavior:**

1. Updates execution status to `running`
2. Builds task prompt with workspace context if provided:
   ```
   ## Current Context
   - Workspace ID: <id>
   - Workspace Name: <name>

   You have access to data within this workspace...

   ---

   <original task prompt>
   ```
3. Calls `runAgentById()` with context
4. Updates execution record with results
5. Handles errors and updates status accordingly

#### `runAgentById()`

Fetches agent configuration and runs the agent.

```typescript
export async function runAgentById(
  agentId: string,
  taskPrompt: string,
  options?: {
    maxTurns?: number
    context?: ToolExecutionContext
    onTodoUpdate?: (todos: AgentTodo[]) => void
    onToolCall?: (toolCall: ToolCallRecord) => void
    onMessage?: (role: 'user' | 'assistant', content: string) => void
  }
): Promise<AgentRunResult>
```

**Behavior:**

1. Fetches agent with all relations (tools, skills, mind, delegations, rules, prompt_sections)
2. Generates SDK config via `generateAgentSDKConfig()`
3. Calls `runAgent()` with full configuration

#### `runAgent()`

The core multi-turn agent loop.

```typescript
export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult>
```

**Key Features:**

- Multi-turn conversation up to `maxTurns` (default: 10)
- Prompt caching for system prompt and tools
- Built-in `TodoWrite` tool for task tracking
- Tool call deduplication within execution
- Result truncation to prevent token explosion
- Cost calculation based on model pricing

### Token/Cost Tracking

```typescript
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-5-20250514':   { input: 15.0, output: 75.0 },
  // ... per 1M tokens in USD
}
```

The `calculateTokenCost()` function computes:
- Input cost
- Output cost
- Cache write cost (1.25x input price)
- Cache read cost (0.1x input price)
- Total cost
- Savings from caching

---

## Key Features

### Workspace Context Injection

When a workspace is selected in the test panel:

1. The workspace ID is sent with the run request
2. `runScheduledExecution()` prepends context to the task prompt
3. Tool calls include the workspace ID in `ToolExecutionContext`
4. MCP tools use the workspace ID to scope their operations

### Approval System

Schedules can be configured with `requires_approval: true`:

- Executions are created with status `pending_approval`
- They appear in the Scheduled Tasks page
- Admins can review the task prompt and agent before running
- Approval triggers immediate execution
- Rejection stores an optional reason

### Audit Trail

All actions are logged via `logAdminAction()`:

| Action | Description |
|--------|-------------|
| `schedule_run_pending` | Execution created, awaiting approval |
| `schedule_run_started` | Execution started (no approval needed) |
| `schedule_execution_approved` | Admin approved execution |
| `schedule_execution_rejected` | Admin rejected execution |

### Error Handling

- API routes return appropriate HTTP status codes
- Execution failures update the status to `failed` with `error_message`
- Tool call failures are recorded but don't necessarily fail the execution
- The UI displays errors prominently with red styling

### Tool Call Features

- **Deduplication:** Same tool with same inputs returns cached result
- **Truncation:** Large results are truncated to prevent token explosion
- **Limit Enforcement:** Data-heavy tools have default and max limits:
  ```typescript
  const TOOL_DEFAULT_LIMITS = {
    project_list: { limit: 10, status: 'active' },
    task_list: { limit: 20 },
    // ...
  }
  ```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/components/admin/schedule-test-panel.tsx` | Main test panel UI |
| `src/components/admin/cron-validator.tsx` | Cron expression validator |
| `src/components/admin/execution-details.tsx` | Execution results display |
| `src/app/admin/scheduled-tasks/page.tsx` | Scheduled tasks page |
| `src/app/api/admin/agents/[id]/schedules/[scheduleId]/run/route.ts` | Run schedule endpoint |
| `src/app/api/admin/cron/validate/route.ts` | Cron validation endpoint |
| `src/app/api/admin/schedules/route.ts` | List schedules endpoint |
| `src/app/api/admin/scheduled-tasks/route.ts` | List executions endpoint |
| `src/app/api/admin/scheduled-tasks/[executionId]/approve/route.ts` | Approve endpoint |
| `src/app/api/admin/scheduled-tasks/[executionId]/reject/route.ts` | Reject endpoint |
| `src/lib/agent-runtime.ts` | Agent execution runtime |
| `src/types/agents.ts` | Type definitions |
