# AI Agents Infrastructure Documentation

This document describes the architecture of the AI agents system in the DreamTeam admin panel.

## 1. Overview

The AI Agents system provides a comprehensive platform for configuring, testing, versioning, and deploying AI agents powered by Anthropic's Claude models. Key capabilities include:

- **Agent Configuration**: Define agent identity, model selection, system prompts, and behavioral rules
- **Tool Assignment**: Assign DreamTeam MCP tools to agents from a registry of 291 built-in tools
- **Skills System**: Attach reusable skills with teachable learning capabilities
- **Knowledge System (Mind)**: Hierarchical knowledge inheritance (company → department → agent)
- **Versioning**: Automatic version tracking with config snapshots and rollback support
- **Testing**: Sandbox environment with mock/simulate/live tool execution modes
- **Scheduling**: Cron-based recurring tasks with optional approval workflows
- **Delegation**: Agent-to-agent task delegation with conditional routing

## 2. Database Schema

### 2.1 Core Tables

#### `ai_agents`
Primary table storing agent configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Agent display name |
| `slug` | TEXT | URL-safe unique identifier |
| `description` | TEXT | Agent description |
| `department_id` | UUID | FK to agent_departments |
| `avatar_url` | TEXT | Agent avatar image URL |
| `model` | TEXT | Model: 'sonnet', 'opus', 'haiku' |
| `system_prompt` | TEXT | Base system prompt |
| `permission_mode` | TEXT | 'default', 'acceptEdits', 'bypassPermissions' |
| `max_turns` | INTEGER | Maximum conversation turns (default: 10) |
| `is_enabled` | BOOLEAN | Agent active status |
| `is_head` | BOOLEAN | Department head agent flag |
| `config` | JSONB | Additional configuration |
| `current_version` | INTEGER | Current working version |
| `published_version` | INTEGER | Published/production version |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `agent_departments`
Organizational units for grouping agents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Department name |
| `description` | TEXT | Department description |
| `icon` | TEXT | Icon identifier (default: 'building-2') |
| `default_model` | TEXT | Default model for department agents |
| `head_agent_id` | UUID | FK to department head agent |

#### `agent_tools`
Registry of available tools (DreamTeam MCP tools).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Unique tool name |
| `description` | TEXT | Tool description |
| `category` | TEXT | Category: finance, crm, team, projects, knowledge, communications, goals, agents |
| `input_schema` | JSONB | JSON Schema for tool inputs |
| `is_builtin` | BOOLEAN | Built-in vs custom tool |
| `is_enabled` | BOOLEAN | Tool availability |

#### `ai_agent_tools`
Many-to-many assignment of tools to agents.

| Column | Type | Description |
|--------|------|-------------|
| `agent_id` | UUID | FK to ai_agents |
| `tool_id` | UUID | FK to agent_tools |
| `config` | JSONB | Tool-specific configuration |

### 2.2 Skills System

#### `agent_skills`
Library of reusable skills with learning capabilities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Unique skill name |
| `description` | TEXT | Skill description |
| `department_id` | UUID | Optional department scope |
| `skill_content` | TEXT | Skill instructions (markdown) |
| `category` | TEXT | Skill category (default: 'general') |
| `version` | INTEGER | Skill version number |
| `triggers` | JSONB | Array of trigger phrases |
| `templates` | JSONB | Response templates |
| `edge_cases` | JSONB | Special case handling |
| `learned_rules_count` | INTEGER | Count of learned rules |
| `is_system` | BOOLEAN | System vs custom skill |
| `is_enabled` | BOOLEAN | Skill availability |

#### `ai_agent_skills`
Many-to-many assignment of skills to agents.

| Column | Type | Description |
|--------|------|-------------|
| `agent_id` | UUID | FK to ai_agents |
| `skill_id` | UUID | FK to agent_skills |

#### `skill_teachings`
User corrections for skill learning.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `skill_id` | UUID | FK to agent_skills |
| `agent_id` | UUID | Optional FK to specific agent |
| `workspace_id` | UUID | Workspace context |
| `user_id` | UUID | Teaching user |
| `original_output` | TEXT | Agent's original response |
| `corrected_output` | TEXT | User's corrected response |
| `conversation_id` | UUID | Conversation context |
| `message_context` | JSONB | Additional context |
| `user_instruction` | TEXT | User's correction note |
| `analysis_status` | TEXT | 'pending', 'analyzing', 'completed', 'failed' |
| `analysis_result` | JSONB | Claude analysis output |

#### `skill_learned_rules`
Rules extracted from teachings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `skill_id` | UUID | FK to agent_skills |
| `teaching_id` | UUID | Source teaching |
| `rule_type` | TEXT | 'instruction', 'template', 'edge_case', 'trigger', 'tone', 'format' |
| `rule_content` | TEXT | The actual rule |
| `rule_description` | TEXT | Human-readable description |
| `conditions` | JSONB | When rule applies |
| `scope` | TEXT | 'workspace' or 'global' |
| `workspace_id` | UUID | For workspace-scoped rules |
| `confidence_score` | NUMERIC | 0.0 to 1.0 |
| `times_applied` | INTEGER | Usage count |
| `times_successful` | INTEGER | Success count |
| `is_reviewed` | BOOLEAN | Admin review status |
| `is_active` | BOOLEAN | Rule enabled |

### 2.3 Knowledge System (Mind)

#### `agent_mind`
Knowledge units that can be inherited hierarchically.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Knowledge unit name |
| `slug` | TEXT | URL-safe identifier |
| `description` | TEXT | Description |
| `category` | TEXT | finance, crm, team, projects, knowledge, communications, goals, shared |
| `content` | TEXT | Knowledge content (markdown) |
| `content_type` | TEXT | responsibilities, workflows, policies, metrics, examples, general |
| `position` | INTEGER | Sort order |
| `is_enabled` | BOOLEAN | Active status |
| `workspace_id` | UUID | Optional workspace scope |
| `is_system` | BOOLEAN | System vs custom |
| `scope` | TEXT | 'agent', 'department', or 'company' |
| `department_id` | UUID | For department-scoped mind |

#### `ai_agent_mind`
Assignment of mind units to agents.

| Column | Type | Description |
|--------|------|-------------|
| `agent_id` | UUID | FK to ai_agents |
| `mind_id` | UUID | FK to agent_mind |
| `position_override` | INTEGER | Custom position for this agent |

### 2.4 Rules & Prompt Sections

#### `agent_rules`
Behavioral guardrails for agents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to ai_agents |
| `rule_type` | TEXT | 'always', 'never', 'when', 'respond_with' |
| `rule_content` | TEXT | Rule content |
| `condition` | TEXT | For 'when' type rules |
| `priority` | INTEGER | Sort order |
| `is_enabled` | BOOLEAN | Active status |

#### `agent_prompt_sections`
Structured system prompt building blocks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to ai_agents |
| `section_type` | TEXT | 'identity', 'personality', 'capabilities', 'constraints', 'examples', 'custom' |
| `section_title` | TEXT | Section header |
| `section_content` | TEXT | Section content |
| `position` | INTEGER | Sort order |
| `is_enabled` | BOOLEAN | Active status |

#### `agent_prompt_templates`
Pre-built prompt templates by role.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Template name |
| `description` | TEXT | Template description |
| `role` | TEXT | Role: 'sdr', 'account_executive', 'cs_manager', etc. |
| `department` | TEXT | Associated department |
| `sections` | JSONB | Array of {type, title, content} |
| `is_system` | BOOLEAN | System vs custom |

### 2.5 Delegation

#### `agent_delegations`
Agent-to-agent task routing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `from_agent_id` | UUID | Source agent |
| `to_agent_id` | UUID | Target agent |
| `condition` | TEXT | When to delegate |
| `context_template` | TEXT | Context to pass |

### 2.6 Versioning

#### `agent_versions`
Version history with config snapshots.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to ai_agents |
| `version` | INTEGER | Version number |
| `config_snapshot` | JSONB | Complete agent config at this version |
| `change_type` | TEXT | 'created', 'identity', 'tools', 'skills', 'prompt', 'team', 'rules', 'rollback', 'published' |
| `change_description` | TEXT | Human-readable change note |
| `change_details` | JSONB | Detailed change data |
| `is_published` | BOOLEAN | Production version flag |
| `published_at` | TIMESTAMPTZ | Publication timestamp |
| `published_by` | UUID | Publishing user |
| `created_by` | UUID | Version creator |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### 2.7 Testing

#### `agent_test_sessions`
Sandbox test sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to ai_agents |
| `version` | INTEGER | Version being tested |
| `started_by` | UUID | Tester user |
| `started_at` | TIMESTAMPTZ | Session start |
| `ended_at` | TIMESTAMPTZ | Session end |
| `test_config` | JSONB | {tool_mode: 'mock' \| 'simulate' \| 'live'} |
| `total_turns` | INTEGER | Turn count |
| `total_tokens` | INTEGER | Token usage |
| `total_cost_usd` | NUMERIC | Estimated cost |
| `status` | TEXT | 'active', 'completed', 'failed', 'timeout' |
| `error_message` | TEXT | Error if failed |
| `notes` | TEXT | Session notes |

#### `agent_test_messages`
Test conversation history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK to agent_test_sessions |
| `role` | TEXT | 'user', 'assistant', 'system', 'tool_use', 'tool_result' |
| `content` | TEXT | Message content |
| `tool_name` | TEXT | Tool name if tool call |
| `tool_input` | JSONB | Tool input parameters |
| `tool_output` | JSONB | Tool result |
| `tool_use_id` | TEXT | Claude's tool_use ID |
| `latency_ms` | INTEGER | Response latency |
| `tokens_input` | INTEGER | Input tokens |
| `tokens_output` | INTEGER | Output tokens |
| `sequence_number` | INTEGER | Message order |

### 2.8 Scheduling

#### `agent_schedules`
Recurring task definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK to ai_agents |
| `name` | TEXT | Schedule name |
| `description` | TEXT | Schedule description |
| `cron_expression` | TEXT | Cron timing (e.g., '0 9 * * 1' for weekly Monday 9am) |
| `timezone` | TEXT | Timezone (default: 'UTC') |
| `task_prompt` | TEXT | Prompt for the agent |
| `requires_approval` | BOOLEAN | Approval workflow flag |
| `output_config` | JSONB | Output configuration |
| `is_enabled` | BOOLEAN | Active status |
| `last_run_at` | TIMESTAMPTZ | Last execution |
| `next_run_at` | TIMESTAMPTZ | Next scheduled run |
| `created_by` | UUID | Creator |

#### `agent_schedule_executions`
Execution history with approval workflow.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `schedule_id` | UUID | FK to agent_schedules |
| `agent_id` | UUID | FK to ai_agents |
| `scheduled_for` | TIMESTAMPTZ | Scheduled time |
| `started_at` | TIMESTAMPTZ | Actual start |
| `completed_at` | TIMESTAMPTZ | Completion time |
| `status` | TEXT | 'pending_approval', 'approved', 'rejected', 'running', 'completed', 'failed', 'cancelled' |
| `approved_by` | UUID | Approver |
| `approved_at` | TIMESTAMPTZ | Approval time |
| `rejection_reason` | TEXT | If rejected |
| `result` | JSONB | Execution result |
| `tool_calls` | JSONB | Tools used |
| `error_message` | TEXT | If failed |
| `tokens_input` | INTEGER | Token usage |
| `tokens_output` | INTEGER | Token usage |
| `cost_usd` | NUMERIC | Estimated cost |
| `duration_ms` | INTEGER | Execution duration |

### 2.9 Entity Relationship Diagram

```
┌─────────────────────┐
│  agent_departments  │
│─────────────────────│
│  id (PK)            │◄──────────────────────┐
│  name               │                       │
│  head_agent_id (FK) │───────────┐           │
└─────────────────────┘           │           │
                                  │           │
                                  ▼           │
┌─────────────────────┐    ┌─────────────────────┐
│    agent_tools      │    │      ai_agents      │
│─────────────────────│    │─────────────────────│
│  id (PK)            │    │  id (PK)            │
│  name               │    │  name               │
│  category           │    │  department_id (FK) │───┘
│  input_schema       │    │  model              │
└────────┬────────────┘    │  system_prompt      │
         │                 │  current_version    │
         │                 │  published_version  │
         │                 └──────────┬──────────┘
         │                            │
         │    ┌───────────────────────┼───────────────────────┐
         │    │                       │                       │
         ▼    ▼                       ▼                       ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   ai_agent_tools    │    │   ai_agent_skills   │    │   ai_agent_mind     │
│─────────────────────│    │─────────────────────│    │─────────────────────│
│  agent_id (PK, FK)  │    │  agent_id (PK, FK)  │    │  agent_id (PK, FK)  │
│  tool_id (PK, FK)   │    │  skill_id (PK, FK)  │    │  mind_id (PK, FK)   │
│  config             │    └──────────┬──────────┘    │  position_override  │
└─────────────────────┘               │               └──────────┬──────────┘
                                      │                          │
                                      ▼                          ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │   agent_skills      │    │     agent_mind      │
                           │─────────────────────│    │─────────────────────│
                           │  id (PK)            │    │  id (PK)            │
                           │  name               │    │  name               │
                           │  skill_content      │    │  content            │
                           │  triggers           │    │  scope              │
                           └──────────┬──────────┘    │  department_id (FK) │
                                      │               └─────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
   ┌─────────────────────┐                         ┌─────────────────────┐
   │  skill_teachings    │                         │ skill_learned_rules │
   │─────────────────────│                         │─────────────────────│
   │  id (PK)            │                         │  id (PK)            │
   │  skill_id (FK)      │                         │  skill_id (FK)      │
   │  original_output    │                         │  teaching_id (FK)   │
   │  corrected_output   │                         │  rule_type          │
   │  analysis_status    │                         │  rule_content       │
   └─────────────────────┘                         │  scope              │
                                                   └─────────────────────┘

Additional Relations from ai_agents:

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    agent_rules      │    │ agent_prompt_sections│   │  agent_delegations  │
│─────────────────────│    │─────────────────────│    │─────────────────────│
│  id (PK)            │    │  id (PK)            │    │  id (PK)            │
│  agent_id (FK)      │    │  agent_id (FK)      │    │  from_agent_id (FK) │
│  rule_type          │    │  section_type       │    │  to_agent_id (FK)   │
│  rule_content       │    │  section_content    │    │  condition          │
│  condition          │    │  position           │    │  context_template   │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│   agent_versions    │    │   agent_schedules   │
│─────────────────────│    │─────────────────────│
│  id (PK)            │    │  id (PK)            │
│  agent_id (FK)      │    │  agent_id (FK)      │
│  version            │    │  cron_expression    │
│  config_snapshot    │    │  task_prompt        │
│  change_type        │    │  requires_approval  │
│  is_published       │    └──────────┬──────────┘
└─────────────────────┘               │
                                      ▼
                           ┌─────────────────────────────┐
                           │ agent_schedule_executions   │
                           │─────────────────────────────│
                           │  id (PK)                    │
                           │  schedule_id (FK)           │
                           │  status                     │
                           │  result                     │
                           └─────────────────────────────┘
```

## 3. Type System

### 3.1 Core Types

```typescript
// Model options
type AgentModel = 'sonnet' | 'opus' | 'haiku'

// Permission modes for tool execution
type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'

// Primary agent interface
interface Agent {
  id: string
  name: string
  slug: string | null
  description: string | null
  department_id: string | null
  avatar_url: string | null
  model: AgentModel
  system_prompt: string
  permission_mode: PermissionMode
  max_turns: number
  is_enabled: boolean
  is_head: boolean
  config: Record<string, unknown>
  current_version: number
  published_version: number | null
  created_at: string
  updated_at: string
}

// Agent with all relations loaded
interface AgentWithRelations extends Agent {
  department?: AgentDepartment | null
  tools?: AgentToolAssignment[]
  skills?: AgentSkillAssignment[]
  mind?: AgentMindAssignment[]
  delegations?: AgentDelegation[]
  rules?: AgentRule[]
  prompt_sections?: AgentPromptSection[]
}
```

### 3.2 Tool Types

```typescript
type ToolCategory = 'finance' | 'crm' | 'team' | 'projects' |
                    'knowledge' | 'communications' | 'goals' | 'agents'

interface AgentTool {
  id: string
  name: string
  description: string | null
  category: ToolCategory
  input_schema: Record<string, unknown>
  is_builtin: boolean
  is_enabled: boolean
}
```

### 3.3 Mind Types

```typescript
type MindCategory = 'finance' | 'crm' | 'team' | 'projects' |
                    'knowledge' | 'communications' | 'goals' | 'shared'

type MindContentType = 'responsibilities' | 'workflows' | 'policies' |
                       'metrics' | 'examples' | 'general'

type MindScope = 'agent' | 'department' | 'company'

interface AgentMind {
  id: string
  name: string
  slug: string
  description: string | null
  category: MindCategory
  content: string
  content_type: MindContentType
  position: number
  is_enabled: boolean
  scope: MindScope
  department_id: string | null
}
```

### 3.4 Rule Types

```typescript
type RuleType = 'always' | 'never' | 'when' | 'respond_with'

interface AgentRule {
  id: string
  agent_id: string
  rule_type: RuleType
  rule_content: string
  condition: string | null  // For 'when' type rules
  priority: number
  is_enabled: boolean
}
```

### 3.5 SDK Config Types

```typescript
type SDKModelName =
  | 'claude-sonnet-4-5-20250929'
  | 'claude-opus-4-5-20251101'
  | 'claude-haiku-4-5-20251001'

interface AgentSDKConfig {
  name: string
  slug?: string
  description?: string
  model: SDKModelName
  systemPrompt: string
  maxTurns: number
  permissionMode: PermissionMode
  tools: SDKTool[]
  skills?: SDKSkill[]
  rules?: SDKRule[]
  promptSections?: SDKPromptSection[]
  delegations?: SDKDelegation[]
  isHead?: boolean
  departmentId?: string
}
```

## 4. API Endpoints

### 4.1 Agent CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents` | List all agents (filter: department_id, enabled) |
| POST | `/api/admin/agents` | Create new agent |
| GET | `/api/admin/agents/[id]` | Get agent with all relations + SDK config |
| PATCH | `/api/admin/agents/[id]` | Update agent properties |
| DELETE | `/api/admin/agents/[id]` | Delete agent |

### 4.2 Sub-Resource Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/tools` | Get assigned tools |
| PUT | `/api/admin/agents/[id]/tools` | Replace all tool assignments |
| GET | `/api/admin/agents/[id]/skills` | Get assigned skills |
| PUT | `/api/admin/agents/[id]/skills` | Replace all skill assignments |
| GET | `/api/admin/agents/[id]/mind` | Get assigned mind units |
| PUT | `/api/admin/agents/[id]/mind` | Replace all mind assignments |

### 4.3 Rules Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/rules` | List agent rules |
| POST | `/api/admin/agents/[id]/rules` | Create new rule |
| PATCH | `/api/admin/agents/[id]/rules/[ruleId]` | Update rule |
| DELETE | `/api/admin/agents/[id]/rules/[ruleId]` | Delete rule |

### 4.4 Prompt Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/prompt-sections` | List prompt sections |
| POST | `/api/admin/agents/[id]/prompt-sections` | Create section |
| PATCH | `/api/admin/agents/[id]/prompt-sections/[sectionId]` | Update section |
| DELETE | `/api/admin/agents/[id]/prompt-sections/[sectionId]` | Delete section |
| PUT | `/api/admin/agents/[id]/prompt-sections` | Reorder sections |

### 4.5 Team (Delegations)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/team` | Get delegation config |
| PUT | `/api/admin/agents/[id]/team` | Update delegations |

### 4.6 Versioning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/versions` | List version history |
| POST | `/api/admin/agents/[id]/versions` | Create new version |
| POST | `/api/admin/agents/[id]/publish` | Publish a version |

### 4.7 Testing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/test` | List test sessions |
| POST | `/api/admin/agents/[id]/test` | Start new test session |
| GET | `/api/admin/agents/[id]/test/[sessionId]` | Get session with messages |
| PATCH | `/api/admin/agents/[id]/test/[sessionId]` | End session |
| POST | `/api/admin/agents/[id]/test/[sessionId]/message` | Send message in session |

### 4.8 Scheduling

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/schedules` | List schedules |
| POST | `/api/admin/agents/[id]/schedules` | Create schedule |
| PATCH | `/api/admin/agents/[id]/schedules/[scheduleId]` | Update schedule |
| DELETE | `/api/admin/agents/[id]/schedules/[scheduleId]` | Delete schedule |
| POST | `/api/admin/agents/[id]/schedules/[scheduleId]/run` | Trigger manual run |

### 4.9 Export & Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/agents/[id]/export` | Export agent config as JSON |
| GET | `/api/admin/agents/prompt-templates` | List prompt templates |

## 5. SDK Config Generation

The `generateAgentSDKConfig()` function in `src/lib/agent-sdk.ts` compiles a complete configuration compatible with the Anthropic Claude Agent SDK.

### 5.1 Model Mapping

| Admin Model | SDK Model Name |
|-------------|----------------|
| `haiku` | `claude-haiku-4-5-20251001` |
| `sonnet` | `claude-sonnet-4-5-20250929` |
| `opus` | `claude-opus-4-5-20251101` |

### 5.2 System Prompt Compilation

The system prompt is compiled from multiple sources in this order:

1. **Prompt Sections** (or base `system_prompt` if no sections exist)
2. **Mind** - Organized by content type (responsibilities, workflows, policies, metrics, examples, general)
3. **Skills** - Added as "Available Skills" section
4. **Rules** - Compiled into sections:
   - "Always" rules
   - "Never" rules
   - "Conditional Behaviors" (when rules)
   - "Standard Responses" (respond_with rules)

### 5.3 Generated Config Structure

```typescript
{
  name: "Agent Name",
  slug: "agent-slug",
  description: "Agent description",
  model: "claude-sonnet-4-5-20250929",
  systemPrompt: "Compiled system prompt...",
  maxTurns: 10,
  permissionMode: "default",
  tools: [
    { name: "tool_name", description: "Tool desc", input_schema: {...} }
  ],
  skills: [
    { name: "skill-name", content: "...", triggers: ["phrase1", "phrase2"] }
  ],
  rules: [
    { type: "always", content: "Rule content", priority: 0 }
  ],
  delegations: [
    { toAgent: "Other Agent", toAgentId: "uuid", condition: "When..." }
  ]
}
```

## 6. Hierarchical Knowledge System

The Mind system provides hierarchical knowledge inheritance:

### 6.1 Inheritance Levels

1. **Company Level** (`scope: 'company'`)
   - Inherited by ALL agents in the organization
   - Contains company-wide policies, values, and guidelines

2. **Department Level** (`scope: 'department'`)
   - Inherited by all agents in that department
   - Contains department-specific workflows and procedures

3. **Agent Level** (`scope: 'agent'`)
   - Specific to individual agents
   - Contains role-specific knowledge

### 6.2 Content Types

| Type | Description |
|------|-------------|
| `responsibilities` | What the agent is responsible for |
| `workflows` | Step-by-step processes |
| `policies` | Rules and guidelines to follow |
| `metrics` | KPIs and success measures |
| `examples` | Few-shot examples of ideal behavior |
| `general` | Other knowledge |

### 6.3 Resolution Order

When compiling an agent's knowledge:
1. Company-level mind (all agents)
2. Department-level mind (matching department_id)
3. Agent-level mind (directly assigned)

## 7. Key Features

### 7.1 Versioning

- **Automatic Tracking**: Every significant change creates a new version
- **Config Snapshots**: Complete agent config captured at each version
- **Change Types**: 'created', 'identity', 'tools', 'skills', 'prompt', 'team', 'rules', 'rollback', 'published'
- **Publishing**: Mark a version as production-ready
- **Rollback**: Restore any previous version

### 7.2 Testing (Sandbox)

- **Tool Modes**:
  - `mock`: Returns predefined mock responses
  - `simulate`: Simulates tool execution without side effects
  - `live`: Executes real tools (use with caution)
- **Session Tracking**: Messages, tool calls, latency, token usage
- **Cost Estimation**: Approximate USD cost tracking

### 7.3 Scheduling

- **Cron Expressions**: Standard cron syntax for timing
- **Timezone Support**: Execute in any timezone
- **Approval Workflow**: Optional human approval before execution
- **Execution History**: Full audit trail of scheduled runs
- **Presets**: Daily, Weekly, Monthly, Quarterly, Custom

### 7.4 Skill Learning

- **User Corrections**: Capture original vs corrected outputs
- **Analysis Pipeline**: Claude analyzes corrections to extract patterns
- **Rule Extraction**: Convert patterns into structured rules
- **Scope Control**: Workspace-specific or global rules
- **Admin Review**: Review and promote learned rules

### 7.5 Agent Delegation

- **Conditional Routing**: Delegate based on conditions
- **Context Templates**: Pass relevant context to target agent
- **No Self-Delegation**: Enforced at database level
- **Bidirectional Support**: Agents can delegate to each other

## 8. Built-in Tools

The system includes 291 built-in DreamTeam MCP tools across 8 departments:

| Department | Tool Count | Description |
|------------|------------|-------------|
| **Finance** | 62 | Accounts, Transactions, Categories, Budgets, Subscriptions, Recurring Rules, Analytics |
| **CRM** | 53 | Contacts, Leads, Pipelines, Deals, Activities |
| **Team** | 38 | Workspaces, Members, Channels, Messages, Direct Messages |
| **Projects** | 40 | Departments, Projects, Tasks, Milestones |
| **Knowledge** | 36 | Categories, Templates, Pages, Whiteboards |
| **Communications** | 14 | Phone Numbers, SMS, Calls |
| **Goals & KPIs** | 21 | Goals, Exit Plans, KPIs |
| **Agents** | 27 | Agents, Conversations, Memories, Workflows |

### Tool Categories

- `finance`: Financial operations (accounts, transactions, budgets)
- `crm`: Customer relationship management
- `team`: Team communication and collaboration
- `projects`: Project and task management
- `knowledge`: Knowledge base and documentation
- `communications`: Phone, SMS, and call handling
- `goals`: Goals, KPIs, and exit planning
- `agents`: Agent management and workflows

---

## Source Files

- **Migrations**: `supabase/migrations/060-063_*.sql`
- **Types**: `src/types/agents.ts`
- **SDK**: `src/lib/agent-sdk.ts`
- **API Routes**: `src/app/api/admin/agents/`
- **UI Pages**: `src/app/admin/agents/`
