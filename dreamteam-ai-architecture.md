# DreamTeam AI — Agent Platform Architecture

> **Build the factory that builds the robots, not 38 individual agents.**

This document is the complete technical reference for the DreamTeam AI agent platform. It covers the agent runtime, MCP tools, skills system, teaching/learning, orchestration, and the Agent Builder UI.

---

## Table of Contents

1. [Core Thesis](#core-thesis)
2. [Agent SDK Components](#agent-sdk-components)
3. [MCP Tools (291 tools)](#mcp-tools-291-tools)
4. [Skills Architecture](#skills-architecture)
5. [Teaching System (The Moat)](#teaching-system-the-moat)
6. [Orchestration — Agent-to-Agent](#orchestration--agent-to-agent)
7. [Agent Builder UI](#agent-builder-ui)
8. [Database Schema](#database-schema)
9. [Build Strategy](#build-strategy)
10. [Competitive Advantages](#competitive-advantages)

---

## Core Thesis

**The Problem:** Traditional "AI agents" are static prompt wrappers that don't learn or improve. Building 38 separate agents means 38x the maintenance, 38x the prompt engineering, zero cross-pollination.

**The Solution:** A platform that enables rapid agent creation through UI configuration (not code), where agents get smarter through user teaching, creating a compound data advantage.

**What We're Building:**
- Infrastructure for creating agents, not pre-built agents
- A teaching system that turns every user interaction into training data
- Agent-to-agent collaboration that mimics real team dynamics
- Skills as an evolving data layer, not static instructions

**Business Model:**
- **Starter:** 10 agents, $3K/mo
- **Professional:** 25 agents, $6K/mo  
- **Enterprise:** Unlimited agents + Agent Builder access, $10K+/mo

Selling virtual headcount, not chatbots. Replace 3-5 junior/mid-level hires ($150-300K/year) with platform ($36-120K/year).

---

## Agent SDK Components

DreamTeam agents are built on the Anthropic Claude Agent SDK. Understanding these primitives is essential.

### Tools (Built-in)

Core file and execution tools provided by the SDK:

| Tool | Description |
|------|-------------|
| `Read` | Read file contents |
| `Write` | Write/create files |
| `Edit` | Edit existing files |
| `MultiEdit` | Batch file edits |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `Bash` | Execute shell commands |
| `WebSearch` | Search the web |

Controlled via `allowedTools` / `disallowedTools` arrays in agent config.

### MCP (Model Context Protocol)

Universal protocol for external integrations. MCP is how agents access DreamTeam's tools.

**Three MCP Types:**

| Type | Description | Use Case |
|------|-------------|----------|
| **Stdio MCP** | External processes via stdin/stdout | CLI tools, scripts |
| **SSE/HTTP MCP** | Remote API endpoints | Third-party services |
| **SDK MCP** | In-process tools (no subprocess overhead) | DreamTeam tools |

**Tool Naming:** `mcp__<server>__<tool>`

Example: `mcp__dreamteam__contact_create`

### Skills (Agent Skills)

Directories containing instructions, scripts, and resources. Skills are the "how to" layer — they tell agents how to accomplish tasks using their tools.

**Skill Structure:**
```
/skills/cold-outreach/
├── SKILL.md          # Instructions, templates, edge cases
├── templates/        # Email templates, scripts
└── resources/        # Reference docs, examples
```

Skills use **progressive disclosure** — only relevant context loads when needed. Skills are now an open standard at [agentskills.io](https://agentskills.io).

### Subagents

Specialized agents that can be invoked by parent agents. Stored in:
- `.claude/agents/` (project-level)
- `~/.claude/agents/` (user-level)

Subagents maintain separate context, can have restricted tool access, and custom prompts. Enable parallelization and context isolation.

### Hooks

Deterministic callbacks at execution points:

| Hook | Trigger Point | Use Case |
|------|---------------|----------|
| `PreToolUse` | Before tool execution | Validate, block, modify |
| `PostToolUse` | After tool execution | Log, transform output |
| `SubagentStop` | When subagent completes | Aggregate results |
| `Stop` | When agent completes | Cleanup, notifications |

Hooks can be shell commands or Python functions.

### Permissions System

```typescript
interface PermissionConfig {
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  allowedTools: string[];
  disallowedTools: string[];
  humanApprovalRequired: string[];  // Tools requiring confirmation
}
```

Subagents inherit or override parent permissions. Human-in-the-loop confirmations for dangerous operations.

### Sessions

| Feature | Description |
|---------|-------------|
| Persistence | Enable/disable session memory |
| Forking | Branch sessions for parallel exploration |
| Checkpointing | File rollback capability |
| Session IDs | Resume conversations |

### Context Management

| Mechanism | Purpose |
|-----------|---------|
| `CLAUDE.md` | Project context, conventions, architecture notes |
| Slash commands | Custom commands in `.claude/commands/` |
| System prompts | Define role, expertise, behavior |
| Context compaction | Auto-summarization when hitting limits |

---

## MCP Tools (291 tools)

The DreamTeam MCP server exposes 291 tools across 8 departments. These wrap existing Supabase calls — same backend logic, different caller (agent vs human).

### Tool Naming Convention

Tools follow the pattern: `{entity}_{action}`

Examples: `account_create`, `transaction_list`, `deal_mark_won`

### Scoping Patterns

| Scope | Description | Departments |
|-------|-------------|-------------|
| `workspace_id` | Multi-tenant workspace isolation | Finance, CRM, Team, Projects, Knowledge, Agents |
| `user_id` | User-specific data | Communications, Workflows |
| `profile_id` | Personal data (not workspace-bound) | Goals & KPIs |

### Response Format

All tools return consistent JSON:
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "isError": false
}
```

---

### 1. Finance (62 tools)

Financial management tools for accounts, transactions, budgets, and analytics.

#### Accounts (8 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `account_list` | List all accounts | `workspace_id` | `type`, `is_active`, `limit`, `offset` |
| `account_get` | Get single account | `workspace_id`, `account_id` | - |
| `account_create` | Create account | `workspace_id`, `name`, `type` | `balance`, `institution`, `currency` |
| `account_update` | Update account | `workspace_id`, `account_id` | `name`, `type`, `institution`, `is_active` |
| `account_delete` | Delete account | `workspace_id`, `account_id` | - |
| `account_get_balance` | Get current balance | `workspace_id`, `account_id` | - |
| `account_list_by_type` | Filter by type | `workspace_id`, `type` | - |
| `account_get_totals` | Total balances | `workspace_id` | `group_by` |

**Account Types:** `checking`, `savings`, `credit`, `cash`, `investment`, `loan`, `other`

#### Transactions (12 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `transaction_list` | List with filters | `workspace_id` | `account_id`, `category_id`, `start_date`, `end_date`, `limit`, `offset`, `type` |
| `transaction_get` | Get single | `workspace_id`, `transaction_id` | - |
| `transaction_create` | Create | `workspace_id`, `account_id`, `amount`, `date` | `description`, `category_id`, `notes` |
| `transaction_update` | Update | `workspace_id`, `transaction_id` | `amount`, `date`, `description`, `category_id`, `notes` |
| `transaction_delete` | Delete | `workspace_id`, `transaction_id` | - |
| `transaction_create_transfer` | Transfer between accounts | `workspace_id`, `from_account_id`, `to_account_id`, `amount`, `date` | `description` |
| `transaction_bulk_categorize` | Categorize multiple | `workspace_id`, `transaction_ids[]`, `category_id` | - |
| `transaction_search` | Search by description | `workspace_id`, `query` | `limit` |
| `transaction_get_by_date_range` | Date range filter | `workspace_id`, `start_date`, `end_date` | `account_id` |
| `transaction_get_uncategorized` | Without category | `workspace_id` | `limit` |
| `transaction_get_recent` | Most recent | `workspace_id` | `limit` (default 10) |
| `transaction_get_duplicates` | Find potential dupes | `workspace_id` | `days_window` |

#### Categories (7 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `category_list` | List all | `workspace_id` | `type`, `include_system` |
| `category_get` | Get single | `workspace_id`, `category_id` | - |
| `category_create` | Create custom | `workspace_id`, `name`, `type` | `icon`, `color`, `parent_id` |
| `category_update` | Update | `workspace_id`, `category_id` | `name`, `icon`, `color` |
| `category_delete` | Delete custom | `workspace_id`, `category_id` | - |
| `category_get_spending` | Total spending | `workspace_id`, `category_id` | `start_date`, `end_date` |
| `category_list_with_totals` | With spending totals | `workspace_id` | `start_date`, `end_date` |

**Category Types:** `income`, `expense`

#### Budgets (11 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `budget_list` | List all | `workspace_id` | `is_active` |
| `budget_get` | Get with spending | `workspace_id`, `budget_id` | - |
| `budget_create` | Create | `workspace_id`, `category_id`, `amount`, `period` | `start_date`, `rollover` |
| `budget_update` | Update | `workspace_id`, `budget_id` | `amount`, `period`, `rollover`, `is_active` |
| `budget_delete` | Delete | `workspace_id`, `budget_id` | - |
| `budget_get_status` | Status (on track, over) | `workspace_id`, `budget_id` | - |
| `budget_list_over_limit` | Over limit | `workspace_id` | - |
| `budget_list_with_spending` | With current spending | `workspace_id` | - |
| `budget_add_alert` | Add threshold alert | `workspace_id`, `budget_id`, `threshold_percent` | - |
| `budget_remove_alert` | Remove alert | `workspace_id`, `budget_id`, `threshold_percent` | - |
| `budget_get_alerts_triggered` | All triggered alerts | `workspace_id` | - |

**Budget Periods:** `weekly`, `biweekly`, `monthly`, `yearly`

#### Subscriptions (9 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `subscription_list` | List all | `workspace_id` | `is_active` |
| `subscription_get` | Get single | `workspace_id`, `subscription_id` | - |
| `subscription_create` | Create | `workspace_id`, `name`, `amount`, `frequency`, `next_renewal_date` | `category_id`, `reminder_days_before` |
| `subscription_update` | Update | `workspace_id`, `subscription_id` | `name`, `amount`, `frequency`, `next_renewal_date`, `is_active` |
| `subscription_delete` | Delete | `workspace_id`, `subscription_id` | - |
| `subscription_get_upcoming` | Renewing soon | `workspace_id` | `days_ahead` (default 7) |
| `subscription_get_summary` | Totals | `workspace_id` | - |
| `subscription_detect_from_transactions` | Auto-detect from patterns | `workspace_id` | - |
| `subscription_mark_canceled` | Mark canceled | `workspace_id`, `subscription_id` | - |

**Frequencies:** `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`

#### Recurring Rules (7 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `recurring_rule_list` | List all | `workspace_id` | `is_active` |
| `recurring_rule_get` | Get single | `workspace_id`, `rule_id` | - |
| `recurring_rule_create` | Create | `workspace_id`, `account_id`, `amount`, `description`, `frequency`, `next_date` | `category_id`, `end_date` |
| `recurring_rule_update` | Update | `workspace_id`, `rule_id` | `amount`, `frequency`, `next_date`, `is_active` |
| `recurring_rule_delete` | Delete | `workspace_id`, `rule_id` | - |
| `recurring_rule_skip_next` | Skip next occurrence | `workspace_id`, `rule_id` | - |
| `recurring_rule_generate_transactions` | Generate pending | `workspace_id`, `up_to_date` | - |

#### Analytics (8 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `analytics_get_income_vs_expense` | Income vs expense | `workspace_id`, `start_date`, `end_date` | `group_by` (day, week, month) |
| `analytics_get_spending_by_category` | Spending breakdown | `workspace_id`, `start_date`, `end_date` | `limit` |
| `analytics_get_net_worth` | Total net worth | `workspace_id` | - |
| `analytics_get_cash_flow` | Cash flow analysis | `workspace_id`, `start_date`, `end_date` | - |
| `analytics_get_trends` | Spending/income trends | `workspace_id` | `months` (default 6) |
| `analytics_get_profit_loss` | P&L statement | `workspace_id`, `start_date`, `end_date` | - |
| `analytics_project_cash_flow` | Project future | `workspace_id`, `months_ahead` | - |
| `analytics_get_calendar_events` | Financial calendar | `workspace_id`, `start_date`, `end_date` | - |

---

### 2. CRM (53 tools)

Customer relationship management for contacts, leads, deals, and sales pipelines.

#### Contacts (10 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `contact_list` | List all | `workspace_id` | `search`, `tags`, `source`, `limit`, `offset` |
| `contact_get` | Get single | `workspace_id`, `contact_id` | - |
| `contact_create` | Create | `workspace_id`, `first_name` | `last_name`, `email`, `phone`, `company`, `job_title`, `tags`, `source`, `notes` |
| `contact_update` | Update | `workspace_id`, `contact_id` | `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `tags`, `notes` |
| `contact_delete` | Delete | `workspace_id`, `contact_id` | - |
| `contact_search` | Search | `workspace_id`, `query` | - |
| `contact_add_tag` | Add tag | `workspace_id`, `contact_id`, `tag` | - |
| `contact_remove_tag` | Remove tag | `workspace_id`, `contact_id`, `tag` | - |
| `contact_get_activities` | All activities | `workspace_id`, `contact_id` | - |
| `contact_get_deals` | All deals | `workspace_id`, `contact_id` | - |

#### Leads (12 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `lead_list` | List all | `workspace_id` | `status`, `pipeline_id`, `limit`, `offset` |
| `lead_get` | Get with details | `workspace_id`, `lead_id` | - |
| `lead_create` | Create | `workspace_id`, `name` | `website`, `industry`, `status`, `notes` |
| `lead_update` | Update | `workspace_id`, `lead_id` | `name`, `website`, `industry`, `status`, `notes` |
| `lead_delete` | Delete | `workspace_id`, `lead_id` | - |
| `lead_change_status` | Change status | `workspace_id`, `lead_id`, `status_id` | - |
| `lead_add_contact` | Add contact | `workspace_id`, `lead_id`, `contact_id` | - |
| `lead_add_task` | Add task | `workspace_id`, `lead_id`, `title` | `due_date`, `assignee_id` |
| `lead_complete_task` | Complete task | `workspace_id`, `lead_id`, `task_id` | - |
| `lead_add_opportunity` | Create opportunity | `workspace_id`, `lead_id`, `deal_data` | - |
| `lead_get_tasks` | Get tasks | `workspace_id`, `lead_id` | - |
| `lead_get_opportunities` | Get opportunities | `workspace_id`, `lead_id` | - |

#### Pipelines (9 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `pipeline_list` | List all | `workspace_id` | - |
| `pipeline_get` | Get with stages | `workspace_id`, `pipeline_id` | - |
| `pipeline_create` | Create | `workspace_id`, `name` | `description` |
| `pipeline_update` | Update | `workspace_id`, `pipeline_id` | `name`, `description`, `is_default` |
| `pipeline_delete` | Delete | `workspace_id`, `pipeline_id` | - |
| `pipeline_add_stage` | Add stage | `workspace_id`, `pipeline_id`, `name` | `color`, `win_probability`, `position` |
| `pipeline_update_stage` | Update stage | `workspace_id`, `stage_id` | `name`, `color`, `win_probability`, `position` |
| `pipeline_delete_stage` | Delete stage | `workspace_id`, `stage_id` | - |
| `pipeline_reorder_stages` | Reorder | `workspace_id`, `pipeline_id`, `stage_ids[]` | - |

#### Deals (11 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `deal_list` | List all | `workspace_id` | `pipeline_id`, `stage_id`, `status`, `contact_id`, `limit`, `offset` |
| `deal_get` | Get single | `workspace_id`, `deal_id` | - |
| `deal_create` | Create | `workspace_id`, `name`, `value`, `pipeline_id`, `stage_id` | `contact_id`, `expected_close_date`, `probability`, `notes` |
| `deal_update` | Update | `workspace_id`, `deal_id` | `name`, `value`, `stage_id`, `expected_close_date`, `probability`, `notes` |
| `deal_delete` | Delete | `workspace_id`, `deal_id` | - |
| `deal_move_stage` | Move to stage | `workspace_id`, `deal_id`, `stage_id` | - |
| `deal_mark_won` | Mark won | `workspace_id`, `deal_id` | `actual_close_date` |
| `deal_mark_lost` | Mark lost | `workspace_id`, `deal_id` | `reason` |
| `deal_get_activities` | Get activities | `workspace_id`, `deal_id` | - |
| `deal_get_value_by_stage` | Value by stage | `workspace_id`, `pipeline_id` | - |
| `deal_get_forecast` | Sales forecast | `workspace_id` | `months_ahead` |

#### Activities (11 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `activity_list` | List all | `workspace_id` | `type`, `contact_id`, `deal_id`, `is_completed`, `limit`, `offset` |
| `activity_get` | Get single | `workspace_id`, `activity_id` | - |
| `activity_create` | Create | `workspace_id`, `type`, `subject` | `description`, `contact_id`, `deal_id`, `due_date` |
| `activity_update` | Update | `workspace_id`, `activity_id` | `subject`, `description`, `due_date` |
| `activity_delete` | Delete | `workspace_id`, `activity_id` | - |
| `activity_mark_complete` | Mark complete | `workspace_id`, `activity_id` | - |
| `activity_log_call` | Log call | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description`, `duration_minutes` |
| `activity_log_email` | Log email | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description` |
| `activity_log_meeting` | Log meeting | `workspace_id`, `subject` | `contact_id`, `deal_id`, `description`, `meeting_date` |
| `activity_get_overdue` | Get overdue | `workspace_id` | - |
| `activity_get_upcoming` | Get upcoming | `workspace_id` | `days_ahead` |

---

### 3. Team (38 tools)

Team collaboration for workspaces, channels, messages, and direct messaging.

#### Workspace & Members (8 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `workspace_get` | Get details | `workspace_id` | - |
| `workspace_update` | Update settings | `workspace_id` | `name`, `avatar_url` |
| `workspace_member_list` | List members | `workspace_id` | `role` |
| `workspace_member_get` | Get member | `workspace_id`, `member_id` | - |
| `workspace_member_invite` | Invite user | `workspace_id`, `email` | `role` |
| `workspace_member_update_role` | Update role | `workspace_id`, `member_id`, `role` | - |
| `workspace_member_remove` | Remove member | `workspace_id`, `member_id` | - |
| `workspace_member_set_status` | Set status | `workspace_id`, `member_id`, `status` | `status_text` |

**Member Roles:** `member`, `admin`, `owner`

#### Channels (11 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `channel_list` | List all | `workspace_id` | `include_private` |
| `channel_get` | Get details | `workspace_id`, `channel_id` | - |
| `channel_create` | Create | `workspace_id`, `name` | `description`, `is_private` |
| `channel_update` | Update | `workspace_id`, `channel_id` | `name`, `description` |
| `channel_delete` | Delete/archive | `workspace_id`, `channel_id` | - |
| `channel_join` | Join | `workspace_id`, `channel_id` | - |
| `channel_leave` | Leave | `workspace_id`, `channel_id` | - |
| `channel_add_member` | Add member | `workspace_id`, `channel_id`, `member_id` | - |
| `channel_remove_member` | Remove member | `workspace_id`, `channel_id`, `member_id` | - |
| `channel_get_members` | List members | `workspace_id`, `channel_id` | - |
| `channel_set_notifications` | Set preferences | `workspace_id`, `channel_id`, `notifications` | - |

**Notification Settings:** `all`, `mentions`, `none`

#### Messages (12 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `message_list` | List in channel/DM | `workspace_id` | `channel_id`, `dm_conversation_id`, `limit`, `before`, `after` |
| `message_get` | Get single | `workspace_id`, `message_id` | - |
| `message_send` | Send | `workspace_id`, `content` | `channel_id`, `dm_conversation_id`, `parent_id` |
| `message_update` | Edit | `workspace_id`, `message_id`, `content` | - |
| `message_delete` | Delete | `workspace_id`, `message_id` | - |
| `message_reply` | Reply in thread | `workspace_id`, `parent_message_id`, `content` | - |
| `message_add_reaction` | Add emoji | `workspace_id`, `message_id`, `emoji` | - |
| `message_remove_reaction` | Remove emoji | `workspace_id`, `message_id`, `emoji` | - |
| `message_search` | Search | `workspace_id`, `query` | `channel_id`, `sender_id` |
| `message_get_thread` | Get thread replies | `workspace_id`, `parent_message_id` | - |
| `message_pin` | Pin | `workspace_id`, `message_id` | - |
| `message_unpin` | Unpin | `workspace_id`, `message_id` | - |

#### Direct Messages (7 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `dm_list_conversations` | List DMs | `workspace_id` | - |
| `dm_get_conversation` | Get conversation | `workspace_id`, `conversation_id` | - |
| `dm_create_conversation` | Start DM | `workspace_id`, `participant_ids[]` | - |
| `dm_get_or_create` | Get or create | `workspace_id`, `participant_id` | - |
| `dm_archive_conversation` | Archive | `workspace_id`, `conversation_id` | - |
| `dm_mark_read` | Mark read | `workspace_id`, `conversation_id` | - |
| `dm_get_unread_count` | Unread count | `workspace_id` | - |

---

### 4. Projects (40 tools)

Project management for projects, tasks, milestones, and departments.

#### Departments (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `department_list` | List all | `workspace_id` | - |
| `department_get` | Get single | `workspace_id`, `department_id` | - |
| `department_create` | Create | `workspace_id`, `name` | `description`, `color`, `icon` |
| `department_update` | Update | `workspace_id`, `department_id` | `name`, `description`, `color`, `icon` |
| `department_delete` | Delete | `workspace_id`, `department_id` | - |

#### Projects (11 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `project_list` | List all | `workspace_id` | `status`, `department_id`, `limit`, `offset` |
| `project_get` | Get with details | `workspace_id`, `project_id` | - |
| `project_create` | Create | `workspace_id`, `name` | `description`, `status`, `priority`, `start_date`, `target_end_date`, `budget`, `department_id` |
| `project_update` | Update | `workspace_id`, `project_id` | `name`, `description`, `status`, `priority`, `target_end_date`, `budget` |
| `project_delete` | Delete | `workspace_id`, `project_id` | - |
| `project_archive` | Archive | `workspace_id`, `project_id` | - |
| `project_add_member` | Add member | `workspace_id`, `project_id`, `member_id` | `role`, `hours_per_week` |
| `project_remove_member` | Remove member | `workspace_id`, `project_id`, `member_id` | - |
| `project_get_members` | List members | `workspace_id`, `project_id` | - |
| `project_get_progress` | Progress stats | `workspace_id`, `project_id` | - |
| `project_get_activity` | Activity log | `workspace_id`, `project_id` | `limit` |

**Project Status:** `active`, `on_hold`, `completed`, `archived`
**Project Priority:** `low`, `medium`, `high`, `critical`

#### Tasks (16 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `task_list` | List | `workspace_id` | `project_id`, `assignee_id`, `status`, `priority`, `milestone_id`, `limit`, `offset` |
| `task_get` | Get with details | `workspace_id`, `task_id` | - |
| `task_create` | Create | `workspace_id`, `project_id`, `title` | `description`, `status`, `priority`, `assignee_id`, `due_date`, `estimated_hours`, `parent_task_id` |
| `task_update` | Update | `workspace_id`, `task_id` | `title`, `description`, `status`, `priority`, `due_date`, `estimated_hours`, `actual_hours` |
| `task_delete` | Delete | `workspace_id`, `task_id` | - |
| `task_assign` | Assign | `workspace_id`, `task_id`, `assignee_id` | - |
| `task_unassign` | Unassign | `workspace_id`, `task_id`, `assignee_id` | - |
| `task_change_status` | Change status | `workspace_id`, `task_id`, `status` | - |
| `task_add_dependency` | Add dependency | `workspace_id`, `task_id`, `depends_on_task_id` | `type` |
| `task_remove_dependency` | Remove dependency | `workspace_id`, `task_id`, `depends_on_task_id` | - |
| `task_add_label` | Add label | `workspace_id`, `task_id`, `label_id` | - |
| `task_remove_label` | Remove label | `workspace_id`, `task_id`, `label_id` | - |
| `task_add_comment` | Add comment | `workspace_id`, `task_id`, `content` | - |
| `task_get_comments` | Get comments | `workspace_id`, `task_id` | - |
| `task_get_my_tasks` | Current user's tasks | `workspace_id` | `status` |
| `task_get_overdue` | Overdue tasks | `workspace_id` | `project_id` |

**Task Status:** `todo`, `in_progress`, `review`, `done`
**Task Priority:** `low`, `medium`, `high`, `critical`
**Dependency Types:** `finish_to_start`, `start_to_start`, `finish_to_finish`, `start_to_finish`

#### Milestones (8 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `milestone_list` | List | `workspace_id`, `project_id` | `status` |
| `milestone_get` | Get with tasks | `workspace_id`, `milestone_id` | - |
| `milestone_create` | Create | `workspace_id`, `project_id`, `name`, `target_date` | `description` |
| `milestone_update` | Update | `workspace_id`, `milestone_id` | `name`, `description`, `target_date`, `status` |
| `milestone_delete` | Delete | `workspace_id`, `milestone_id` | - |
| `milestone_add_task` | Add task | `workspace_id`, `milestone_id`, `task_id` | - |
| `milestone_remove_task` | Remove task | `workspace_id`, `milestone_id`, `task_id` | - |
| `milestone_get_progress` | Progress | `workspace_id`, `milestone_id` | - |

**Milestone Status:** `upcoming`, `at_risk`, `completed`, `missed`

---

### 5. Knowledge (36 tools)

Knowledge base for pages, categories, templates, and whiteboards.

#### Categories (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `knowledge_category_list` | List | `workspace_id` | - |
| `knowledge_category_get` | Get with pages | `workspace_id`, `category_id` | - |
| `knowledge_category_create` | Create | `workspace_id`, `name` | `slug`, `color`, `icon` |
| `knowledge_category_update` | Update | `workspace_id`, `category_id` | `name`, `color`, `icon`, `position` |
| `knowledge_category_delete` | Delete | `workspace_id`, `category_id` | - |

#### Templates (6 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `knowledge_template_list` | List | `workspace_id` | `include_system`, `category` |
| `knowledge_template_get` | Get | `workspace_id`, `template_id` | - |
| `knowledge_template_create` | Create | `workspace_id`, `name`, `content` | `description`, `icon`, `category` |
| `knowledge_template_update` | Update | `workspace_id`, `template_id` | `name`, `description`, `icon`, `category`, `content` |
| `knowledge_template_delete` | Delete | `workspace_id`, `template_id` | - |
| `knowledge_template_use` | Create page from template | `workspace_id`, `template_id`, `title` | `parent_id` |

#### Pages (16 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `knowledge_page_list` | List | `workspace_id` | `category_id`, `parent_id`, `is_archived`, `limit`, `offset` |
| `knowledge_page_get` | Get with content | `workspace_id`, `page_id` | - |
| `knowledge_page_create` | Create | `workspace_id`, `title` | `content`, `parent_id`, `icon`, `cover_image`, `template_id` |
| `knowledge_page_update` | Update | `workspace_id`, `page_id` | `title`, `content`, `icon`, `cover_image` |
| `knowledge_page_delete` | Delete | `workspace_id`, `page_id` | - |
| `knowledge_page_archive` | Archive | `workspace_id`, `page_id` | - |
| `knowledge_page_restore` | Restore | `workspace_id`, `page_id` | - |
| `knowledge_page_move` | Move to parent | `workspace_id`, `page_id`, `new_parent_id` | - |
| `knowledge_page_duplicate` | Duplicate | `workspace_id`, `page_id` | - |
| `knowledge_page_favorite` | Add to favorites | `workspace_id`, `page_id` | - |
| `knowledge_page_unfavorite` | Remove favorite | `workspace_id`, `page_id` | - |
| `knowledge_page_search` | Search | `workspace_id`, `query` | - |
| `knowledge_page_get_children` | Get children | `workspace_id`, `page_id` | - |
| `knowledge_page_reorder` | Reorder | `workspace_id`, `page_ids[]` | `parent_id` |
| `knowledge_page_add_category` | Add category | `workspace_id`, `page_id`, `category_id` | - |
| `knowledge_page_remove_category` | Remove category | `workspace_id`, `page_id`, `category_id` | - |

**Note:** Page content stored as BlockNote JSON format.

#### Whiteboards (9 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `knowledge_whiteboard_list` | List all | `workspace_id` | `is_archived`, `limit`, `offset` |
| `knowledge_whiteboard_get` | Get with content | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_create` | Create | `workspace_id`, `title` | `icon`, `content` |
| `knowledge_whiteboard_update` | Update | `workspace_id`, `whiteboard_id` | `title`, `icon`, `content`, `thumbnail` |
| `knowledge_whiteboard_delete` | Delete | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_archive` | Archive | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_restore` | Restore | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_favorite` | Favorite | `workspace_id`, `whiteboard_id` | - |
| `knowledge_whiteboard_unfavorite` | Unfavorite | `workspace_id`, `whiteboard_id` | - |

**Note:** Whiteboard content stored as Excalidraw scene data JSON.

---

### 6. Communications (14 tools)

Communication tools for SMS, calls, and phone numbers.

> **Scoping:** Uses `user_id` instead of `workspace_id` — linked to leads/contacts at user level.

#### Phone Numbers (4 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `phone_number_list` | List user's numbers | `user_id` | `limit`, `offset` |
| `phone_number_provision` | Provision new | `user_id` | `area_code`, `country` (default: US) |
| `phone_number_release` | Release number | `user_id`, `phone_number_id` | - |
| `phone_number_set_default` | Set default outbound | `user_id`, `phone_number_id` | - |

#### SMS (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `sms_send` | Send SMS | `user_id`, `to_phone`, `body` | `from_number`, `lead_id`, `contact_id` |
| `sms_list` | List messages | `user_id` | `phone_number`, `direction`, `limit`, `offset` |
| `sms_get_conversation` | Get thread | `user_id`, `phone_number` | - |
| `sms_get_threads` | List all threads | `user_id` | `limit`, `offset` |
| `sms_mark_thread_read` | Mark read | `user_id`, `phone_number` | - |

**SMS Direction:** `inbound`, `outbound`

#### Calls (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `call_initiate` | Start outbound | `user_id`, `to_phone` | `from_number`, `lead_id`, `contact_id` |
| `call_get` | Get details | `user_id`, `call_id` | - |
| `call_list` | List calls | `user_id` | `direction`, `status`, `limit`, `offset` |
| `call_get_recording` | Get recording URL | `user_id`, `call_id` | - |
| `call_end` | End active call | `user_id`, `call_id` | - |

**Call Status:** `initiated`, `ringing`, `in-progress`, `completed`, `failed`, `busy`, `no-answer`, `canceled`

---

### 7. Goals & KPIs (21 tools)

Goal tracking and KPI management for business metrics.

> **Scoping:** Uses `profile_id` — personal user-level data, not workspace-bound.

#### Goals (7 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `goal_list` | List all | `profile_id` | `type`, `limit`, `offset` |
| `goal_get` | Get with progress | `profile_id`, `goal_id` | - |
| `goal_create` | Create | `profile_id`, `name`, `type`, `target_amount`, `target_date` | `description` |
| `goal_update` | Update | `profile_id`, `goal_id` | `name`, `target_amount`, `target_date`, `description` |
| `goal_delete` | Delete | `profile_id`, `goal_id` | - |
| `goal_get_progress` | Get progress | `profile_id`, `goal_id` | - |
| `goal_update_progress` | Manual update | `profile_id`, `goal_id`, `current_amount` | - |

**Goal Types:** `revenue`, `profit`, `valuation`, `runway`, `revenue_multiple`

#### Exit Plan (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `exit_plan_get` | Get plan | `profile_id` | - |
| `exit_plan_create` | Create | `profile_id`, `target_valuation`, `target_date` | `exit_type`, `notes` |
| `exit_plan_update` | Update | `profile_id` | `target_valuation`, `current_valuation`, `target_multiple`, `target_runway`, `target_date`, `exit_type`, `notes` |
| `exit_plan_delete` | Delete | `profile_id` | - |
| `exit_plan_get_scenarios` | Get scenarios | `profile_id` | - |

**Exit Types:** `acquisition`, `ipo`, `merger`, `liquidation`, `other`

#### KPIs (9 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `kpi_list` | List inputs | `profile_id` | `industry`, `period`, `limit`, `offset` |
| `kpi_get` | Get record | `profile_id`, `kpi_id` | - |
| `kpi_record` | Record values | `profile_id`, `period_start`, `period_end` | `revenue`, `expenses`, `customer_count`, `customer_acquisition_cost`, `lifetime_value`, `churned_customers`, `inventory_value`, `units_sold`, `billable_hours`, `employee_count`, `utilization_target` |
| `kpi_update` | Update values | `profile_id`, `kpi_id` | (same as kpi_record) |
| `kpi_delete` | Delete record | `profile_id`, `kpi_id` | - |
| `kpi_get_trends` | Trends over time | `profile_id`, `metric_name` | `periods` (default 6) |
| `kpi_get_saas_metrics` | SaaS metrics | `profile_id` | - |
| `kpi_get_retail_metrics` | Retail metrics | `profile_id` | - |
| `kpi_get_service_metrics` | Service metrics | `profile_id` | - |

**Industry-Specific Metrics:**
- **SaaS:** MRR, ARR, churn rate, LTV/CAC ratio, ARPU
- **Retail:** Inventory turnover, average sale value, gross margin
- **Service:** Utilization rate, revenue per employee, effective hourly rate

---

### 8. Agents (27 tools)

AI agent management, conversations, memories, and workflow automation.

#### Agents (8 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `agent_list` | List workspace agents | `workspace_id` | `is_active`, `limit`, `offset` |
| `agent_get` | Get details | `workspace_id`, `agent_id` | - |
| `agent_create` | Create | `workspace_id`, `name` | `description`, `system_prompt`, `model`, `tools`, `skill_ids` |
| `agent_update` | Update | `workspace_id`, `agent_id` | `name`, `description`, `system_prompt`, `model`, `tools`, `is_active` |
| `agent_delete` | Delete | `workspace_id`, `agent_id` | - |
| `agent_add_skill` | Add skill | `workspace_id`, `agent_id`, `skill_id` | - |
| `agent_remove_skill` | Remove skill | `workspace_id`, `agent_id`, `skill_id` | - |
| `agent_get_skills` | Get skills | `workspace_id`, `agent_id` | - |

#### Agent Conversations (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `agent_conversation_list` | List conversations | `workspace_id` | `agent_id`, `limit`, `offset` |
| `agent_conversation_get` | Get with messages | `workspace_id`, `conversation_id` | - |
| `agent_conversation_create` | Start conversation | `workspace_id`, `agent_id` | `title` |
| `agent_conversation_send_message` | Send message | `workspace_id`, `conversation_id`, `content` | - |
| `agent_conversation_delete` | Delete | `workspace_id`, `conversation_id` | - |

#### Agent Memories (5 tools)

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `agent_memory_list` | List memories | `workspace_id`, `agent_id` | `limit`, `offset` |
| `agent_memory_create` | Create memory | `workspace_id`, `agent_id`, `path`, `content` | - |
| `agent_memory_update` | Update memory | `workspace_id`, `agent_id`, `memory_id`, `content` | - |
| `agent_memory_delete` | Delete memory | `workspace_id`, `agent_id`, `memory_id` | - |
| `agent_memory_search` | Search memories | `workspace_id`, `agent_id`, `query` | - |

**Note:** Memory content stored as markdown.

#### Workflows (9 tools)

> **Scoping:** Uses `user_id` — user-specific automations.

| Tool | Description | Required | Optional |
|------|-------------|----------|----------|
| `workflow_list` | List | `user_id` | `is_active`, `limit`, `offset` |
| `workflow_get` | Get | `user_id`, `workflow_id` | - |
| `workflow_create` | Create | `user_id`, `name`, `trigger_type`, `actions[]` | `description`, `trigger_config`, `is_active` |
| `workflow_update` | Update | `user_id`, `workflow_id` | `name`, `description`, `trigger_type`, `trigger_config`, `actions`, `is_active` |
| `workflow_delete` | Delete | `user_id`, `workflow_id` | - |
| `workflow_execute` | Manual execute | `user_id`, `workflow_id` | `input` |
| `workflow_get_executions` | Execution history | `user_id`, `workflow_id` | `limit`, `offset` |
| `workflow_enable` | Enable | `user_id`, `workflow_id` | - |
| `workflow_disable` | Disable | `user_id`, `workflow_id` | - |

**Trigger Types:** `schedule`, `webhook`, `event`, `manual`
**Execution Status:** `pending`, `running`, `completed`, `failed`

---

### Tools Summary

| Department | Tools | Scoping |
|------------|-------|---------|
| Finance | 62 | `workspace_id` |
| CRM | 53 | `workspace_id` |
| Team | 38 | `workspace_id` |
| Projects | 40 | `workspace_id` |
| Knowledge | 36 | `workspace_id` |
| Communications | 14 | `user_id` |
| Goals & KPIs | 21 | `profile_id` |
| Agents | 27 | `workspace_id` / `user_id` |
| **Total** | **291** | - |

---

## Skills Architecture

Skills are the "how" layer. **Tools** = what agents CAN do. **Skills** = how they SHOULD do it.

### Skill Structure

```markdown
---
name: cold-outreach
description: Execute multi-touch cold outreach sequences
tools_used: [contact_search, contact_create, email_send, ...]
triggers: ["reach out to", "cold outreach", "prospect"]
---

# Instructions
Step-by-step workflow with templates, edge cases, conditional logic

## Steps
1. Search for existing contact
2. Create contact if not found
3. Research company/person
4. Send personalized first touch
5. Schedule follow-up sequence

## Templates
### First Touch Email
Subject: {{observation}} — quick question
...

## Edge Cases
- If prospect is C-level, be more formal
- If company < 10 employees, skip multi-touch
- If no email found, try LinkedIn outreach

## Learned Rules
(auto-populated from teachings)
```

### Agent-Driven Creation

Build agents first, extract repeatable workflows into skills. Not build-skills-then-hope-agents-use-them.

**Process:**
1. Build agent with tools + system prompt
2. Watch it execute tasks
3. When it does something well repeatedly, extract to skill
4. Skill becomes reusable across agents

### Skill Reuse

Skills like `meeting-booking`, `email-follow-up`, `status-reporting` used across multiple agents. Build once, leverage everywhere.

**Example Skill Usage:**

| Skill | Used By |
|-------|---------|
| `cold-outreach` | SDR Agent, Closer Agent |
| `meeting-booking` | SDR Agent, CS Agent, Recruiter Agent |
| `invoice-follow-up` | AR Clerk, Finance Head |
| `contract-review` | Legal Agent, Sales Agent |
| `status-reporting` | All department heads |

---

## Teaching System (The Moat)

Not feedback forms — **learning by doing.**

### How Teaching Works

```
Agent executes with default skill
           ↓
User clicks "Edit & Teach"
           ↓
User modifies the output
           ↓
Sonnet analyzes: "What changed? Why?"
           ↓
Generates skill update (instruction/template/edge case)
           ↓
Applied to user's instance
           ↓
Admin sees in dashboard
           ↓
Pattern detection clusters similar teachings
           ↓
Admin promotes to default skill for all users
```

### Teaching Flow

**Step 1: Agent Output**
```
Agent sends email:

"Dear Mr. Johnson,

I hope this email finds you well. I am reaching out regarding our 
enterprise software solutions that could benefit Acme Corporation..."
```

**Step 2: User Edits**
```
User modifies to:

"Hey Mike,

Saw you just raised a Series B - congrats! Quick question about how 
you're handling customer onboarding at scale..."
```

**Step 3: Sonnet Analysis**
```json
{
  "change_type": "tone_and_personalization",
  "observations": [
    "Changed formal salutation to casual first name",
    "Removed generic opener ('hope this finds you well')",
    "Added specific company news reference",
    "Made value prop question-based, not statement-based"
  ],
  "suggested_rule": "For Series A/B startups: use casual tone, reference recent funding, lead with curiosity not pitch",
  "confidence": 0.87
}
```

**Step 4: Skill Update**
```markdown
## Learned Rules
- For tech startups (seed through Series C): use casual tone, first name only
- Reference recent company news (funding, product launches, exec hires)
- Lead with observation + question, not feature pitch
- Skip "hope this finds you well" and similar generic openers
```

### Database Schema

```sql
skill_teachings
├── id (uuid)
├── skill_id (uuid)
├── agent_id (uuid)
├── workspace_id (uuid)
├── user_id (uuid)
├── original_output (text)
├── corrected_output (text)
├── task_context (jsonb)
├── analysis (jsonb)           -- Sonnet's analysis
├── applied_update (jsonb)     -- What was added to skill
├── confidence (float)
├── status (enum: pending, applied, rejected)
├── created_at (timestamp)

skill_versions
├── id (uuid)
├── skill_id (uuid)
├── version_number (int)
├── instructions_md (text)
├── learned_rules (jsonb[])
├── changes_summary (text)
├── created_at (timestamp)

teaching_patterns
├── id (uuid)
├── skill_id (uuid)
├── pattern_description (text)
├── proposed_rule (text)
├── teaching_ids (uuid[])      -- Which teachings support this
├── user_count (int)
├── confidence (float)
├── status (enum: proposed, approved, rejected)
├── promoted_at (timestamp)
```

### Admin Dashboard

**Pattern Detection View:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Pattern Detected: "Casual tone for tech companies"                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 34 users made similar corrections:                                      │
│ • Changed formal greetings to casual (28 instances)                     │
│ • Removed "hope this finds you well" (31 instances)                     │
│ • Added company-specific research (22 instances)                        │
│                                                                         │
│ Proposed rule:                                                          │
│ "For tech companies: use casual tone, reference recent news,            │
│  lead with observation not pitch"                                       │
│                                                                         │
│ [Approve & Add to Default Skill]  [Reject]  [View All Teachings]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Data Moat

Every customer interaction trains the platform. After 6 months:
- 50,000+ teachings
- Hundreds of extracted patterns
- Skills that "just work" for most scenarios

Competitors starting from scratch lack thousands of micro-improvements across every skill. **This is the moat.**

---

## Orchestration — Agent-to-Agent

**Not workflow automation — emergent collaboration.**

Agents don't follow predetermined plans. They self-organize using the `ask_agent` tool.

### How It Works

Every agent has awareness of other agents and can consult them directly:

```
Sales Agent working on proposal
           ↓
"Need legal eyes on this" → asks Legal Agent
           ↓
Legal responds (may have asked Finance internally)
           ↓
Sales continues with legal advice
           ↓
Done
```

### The `ask_agent` Tool

```typescript
{
  name: "ask_agent",
  description: "Consult another agent on your team",
  parameters: {
    agent: string,       // which agent to ask
    question: string,    // what you need from them
    context: string,     // relevant background info
    urgency: "blocking" | "advisory"
  }
}
```

**Blocking:** Wait for response before continuing
**Advisory:** Continue but incorporate advice when received

### Call Stack Management

```
User → Sales Agent (depth 0)
     → Legal Agent (depth 1, parent: Sales)
          → Finance Agent (depth 2, parent: Legal)
               ↓
          Finance responds → Legal resumes
               ↓
     Legal responds → Sales resumes
          ↓
Sales responds → User
```

### Guardrails

| Guard | Description |
|-------|-------------|
| Max depth | 2-3 levels (configurable per agent) |
| No loops | Can't ask agent already in chain |
| Scope awareness | Agents know their lane |
| Escalation | Surface to human if too complex |

### Call Tracking

```typescript
interface AgentCall {
  call_id: string;
  originator: string;      // User or agent who started
  caller: string;          // Agent making the call
  callee: string;          // Agent being called
  parent_call_id: string;  // For nested calls
  question: string;
  context: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  response: string;
  depth: number;
  started_at: timestamp;
  completed_at: timestamp;
}
```

### Why Not Orchestrators?

Traditional approach: Central orchestrator routes work, manages state, coordinates agents.

**Problems:**
- Single point of failure
- Doesn't scale with agent count
- Requires pre-defining workflows
- Can't handle emergent situations

**Our approach:** No orchestrator. Just agents collaborating intelligently. Like a real team.

---

## Agent Builder UI

The factory control panel. Create, configure, test, and deploy agents without code.

### Main View — Agent Library

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Agent Builder                                          [+ New Agent]    │
├─────────────────────────────────────────────────────────────────────────┤
│ Filter: [All Departments ▼]  [All Status ▼]  Search: [____________]    │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🎯 SDR Agent                              Sales │ Active │ v2.4    │ │
│ │ Outbound prospecting and lead qualification                        │ │
│ │ Tools: 8 │ Skills: 4 │ Teachings: 127         [Edit] [Test] [···]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 💰 AR Clerk                             Finance │ Active │ v1.8    │ │
│ │ Invoice processing and collections                                 │ │
│ │ Tools: 6 │ Skills: 3 │ Teachings: 84          [Edit] [Test] [···]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Editor — 7 Tabs

| Tab | Purpose |
|-----|---------|
| **Identity** | Name, department, model, status |
| **Tools** | Select MCP tools (checkboxes by category) |
| **Skills** | Assign workflow packages |
| **Prompt** | System prompt editor with templates |
| **Team** | Configure `ask_agent` (who can ask who) |
| **Rules** | Guardrails, rate limits, escalation triggers |
| **Test** | Sandbox with full execution trace |

See the separate **Agent Builder UI Specification** document for complete wireframes and implementation details.

---

## Database Schema

### Core Tables

```sql
-- Agents
agents
├── id (uuid, PK)
├── workspace_id (uuid, FK)
├── name (text)
├── slug (text, unique per workspace)
├── description (text)
├── icon (text)
├── department_id (uuid, FK)
├── role (enum: head, contributor, specialist)
├── model (enum: haiku, sonnet, opus)
├── system_prompt (text)
├── tools (text[])
├── skills (uuid[])
├── team_can_ask (uuid[])
├── team_ask_guidance (jsonb)
├── team_reports_to (uuid)
├── team_can_be_asked_by (uuid[])
├── team_max_depth (int, default 3)
├── rules_approval_required (jsonb[])
├── rules_rate_limits (jsonb)
├── rules_escalation_triggers (jsonb[])
├── rules_off_limits (text[])
├── status (enum: active, paused, draft)
├── version (int)
├── published_at (timestamp)
├── created_at (timestamp)
├── updated_at (timestamp)

-- Agent Versions
agent_versions
├── id (uuid, PK)
├── agent_id (uuid, FK)
├── version (int)
├── config_snapshot (jsonb)
├── changes_summary (text)
├── published_by (uuid, FK)
├── published_at (timestamp)

-- Skills
skills
├── id (uuid, PK)
├── workspace_id (uuid, nullable for system skills)
├── name (text)
├── slug (text)
├── description (text)
├── icon (text)
├── department_id (uuid)
├── trigger_phrases (text[])
├── tools_used (text[])
├── instructions_md (text)
├── templates (jsonb)
├── learned_rules (jsonb[])
├── is_system (bool)
├── is_active (bool)
├── rating_avg (float)
├── rating_count (int)
├── created_at (timestamp)
├── updated_at (timestamp)

-- Skill Teachings
skill_teachings
├── id (uuid, PK)
├── skill_id (uuid, FK)
├── agent_id (uuid, FK)
├── workspace_id (uuid, FK)
├── user_id (uuid, FK)
├── original_output (text)
├── corrected_output (text)
├── task_context (jsonb)
├── analysis (jsonb)
├── applied_update (jsonb)
├── confidence (float)
├── status (enum: pending, applied, rejected)
├── created_at (timestamp)

-- Skill Versions
skill_versions
├── id (uuid, PK)
├── skill_id (uuid, FK)
├── version_number (int)
├── instructions_md (text)
├── learned_rules (jsonb[])
├── changes_summary (text)
├── created_at (timestamp)

-- Teaching Patterns
teaching_patterns
├── id (uuid, PK)
├── skill_id (uuid, FK)
├── pattern_description (text)
├── proposed_rule (text)
├── teaching_ids (uuid[])
├── user_count (int)
├── confidence (float)
├── status (enum: proposed, approved, rejected)
├── promoted_at (timestamp)

-- Agent Calls (Orchestration Tracking)
agent_calls
├── id (uuid, PK)
├── workspace_id (uuid, FK)
├── originator_type (enum: user, agent)
├── originator_id (uuid)
├── caller_agent_id (uuid, FK)
├── callee_agent_id (uuid, FK)
├── parent_call_id (uuid, nullable)
├── question (text)
├── context (text)
├── urgency (enum: blocking, advisory)
├── status (enum: pending, in_progress, completed, failed)
├── response (text)
├── depth (int)
├── started_at (timestamp)
├── completed_at (timestamp)
```

---

## Build Strategy

### Timeline (with parallel Claude Code sessions)

| Week | Focus | Sessions |
|------|-------|----------|
| 1-2 | MCP tools complete (291 tools) | Session 1: Tools ✅ |
| 3 | SDR Agent + 2-3 skills manually | Session 2: SDR Agent |
| 4 | AR Clerk Agent + skills, implement `ask_agent` | Session 3: AR Clerk |
| 5 | Teaching mode backend | Session 4: Teaching |
| 6 | Agent Builder UI (basic) | Session 5: UI |
| 7 | Admin dashboard (teachings, patterns) | Session 6: Admin |
| 8 | Polish, test, ship beta | All |

### Parallel Development

Multiple Claude Code sessions building simultaneously:
- **Session 1:** MCP tools (291 → ✅ done)
- **Session 2:** SDR Agent + cold-outreach skill
- **Session 3:** AR Clerk Agent + invoice-follow-up skill
- **Session 4:** Teaching mode backend
- **Session 5:** Agent Builder UI
- **Session 6:** Admin dashboard

### "Best AI Agent Platform" Requirements

1. **Agents that actually work reliably** — Tools + Skills + Testing
2. **Gets smarter every day** — Teaching mode
3. **Anyone can build agents** — Agent Builder UI
4. **Agents collaborate like real teams** — `ask_agent` orchestration
5. **Compound data advantage** — 50K+ teachings in 6 months

---

## Competitive Advantages

### What No One Else Has

| Advantage | Description |
|-----------|-------------|
| **Teaching mode** | Real-time learning from corrections |
| **Skills as data** | Evolving layer, not static prompts |
| **Agent-to-agent** | First-class collaboration, not workflows |
| **Factory model** | Infrastructure, not fixed product |

### The Moat

Every customer interaction improves skills.

**After 100 users correct "too formal" tone:**
→ Skill automatically knows "be casual for tech"

**After 500 users add company news references:**
→ Skill automatically includes "research recent news before outreach"

Competitors can't replicate accumulated learnings. They start at zero. We start at 50,000+ teachings.

### Why This Wins

Traditional AI agents:
- Static prompts that don't improve
- No collaboration between agents
- Require engineers to modify
- Same capability day 1 and day 365

DreamTeam agents:
- Learn from every interaction
- Collaborate like real teams
- Configured by anyone (Agent Builder)
- Dramatically better at day 365 than day 1

---

## Summary

| Component | Status | Description |
|-----------|--------|-------------|
| MCP Tools | ✅ Complete | 291 tools across 8 departments |
| Agent SDK | ✅ Defined | Tools, Skills, MCP, Subagents, Hooks |
| Skills | 📋 Architecture | Structure, triggers, templates |
| Teaching | 📋 Architecture | Flow, database, admin dashboard |
| Orchestration | 📋 Architecture | `ask_agent`, call tracking, guardrails |
| Agent Builder | 📋 Architecture | 7-tab UI, version control |
| Build Plan | 📋 Defined | 8-week timeline, parallel sessions |

**Next steps:**
1. Build first test agent (SDR)
2. Implement `ask_agent` tool
3. Build teaching mode backend
4. Build Agent Builder UI
5. Ship to beta customers

---

*Last updated: January 2025*
