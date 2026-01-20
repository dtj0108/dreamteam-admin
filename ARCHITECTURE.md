# DreamTeam Admin Panel - Architecture

Internal admin panel for the DreamTeam/FinanceBro platform. Enables team management of users, workspaces, AI agents, feature flags, and platform health.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| AI | Anthropic Claude API (Sonnet, Opus, Haiku) |

## Project Structure

```
src/
├── app/
│   ├── admin/                    # Protected admin pages
│   │   ├── page.tsx              # Dashboard
│   │   ├── users/                # User management
│   │   ├── workspaces/           # Workspace management
│   │   │   └── [id]/             # Workspace detail + team chat
│   │   ├── agents/               # AI agent builder
│   │   │   └── [id]/             # Agent detail editor
│   │   ├── teams/                # Team template builder
│   │   │   └── [id]/             # Team detail editor
│   │   ├── plans/                # Subscription plans
│   │   ├── tools/                # Agent tools registry
│   │   ├── skills/               # Agent skills library
│   │   ├── mcp/                  # MCP integrations
│   │   ├── teachings/            # Teaching examples
│   │   ├── teaching-patterns/    # Teaching pattern detection
│   │   ├── scheduled-tasks/      # Automated task queue
│   │   ├── feature-flags/        # Global feature toggles
│   │   ├── api-keys/             # API key management
│   │   ├── audit-logs/           # Admin action logs
│   │   └── settings/             # Platform settings
│   ├── api/admin/                # Admin API routes
│   └── (auth)/login/             # Login page
├── components/
│   ├── admin/                    # Admin-specific components
│   │   └── team-org-chart/       # Team visualization
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── admin.ts              # Admin client (bypasses RLS)
│   ├── admin-auth.ts             # Auth helpers & logging
│   ├── deployment.ts             # Team deployment logic
│   ├── auto-deploy.ts            # Auto-deployment utilities
│   ├── agent-sdk.ts              # Agent SDK integration
│   ├── workspace-auth.ts         # Workspace auth helpers
│   ├── cron-utils.ts             # Cron expression parsing
│   └── teaching-analysis.ts      # Teaching pattern analysis
├── types/
│   ├── database.ts               # Core database types
│   ├── agents.ts                 # Agent system types
│   ├── teams.ts                  # Team & deployment types
│   └── skills.ts                 # Skill system types
└── supabase/
    └── migrations/               # Database migrations (058-078+)
```

## Core Features

### Platform Admin
- **Users**: View/edit profiles, superadmin management
- **Workspaces**: CRUD operations, member management, deployed teams
- **Feature Flags**: Global toggles with JSON config
- **API Keys**: Workspace-scoped API key management
- **Audit Logs**: Full admin action history with IP/user-agent

### Agent Builder
- **Agents**: Claude-based AI agents with system prompts
- **Models**: Haiku (fast), Sonnet (balanced), Opus (powerful)
- **Permission Modes**: default, acceptEdits, bypassPermissions
- **Tools**: Callable functions with JSON schema input
- **Skills**: Reusable prompt templates with triggers
- **Mind Files**: Context documents (responsibilities, workflows, policies)
- **Rules**: Always/never/when/respond_with behavioral constraints
- **Prompt Sections**: Modular prompt building (identity, personality, capabilities)
- **Versions**: Snapshot-based versioning with publish workflow
- **Test Sessions**: Interactive testing with mock/simulate/live tool modes

### Team System
- **Teams**: Agent team templates with head agent designation
- **Delegations**: Agent-to-agent task handoff rules
- **Team Mind**: Shared knowledge across team agents
- **Plans**: Subscription tiers linked to team templates
- **Deployments**: Deploy team configs to workspaces
- **Customizations**: Per-workspace agent/delegation toggles
- **Agent Channels**: Dedicated channels for agent communication

### Automation
- **Scheduled Tasks**: Cron-based agent task execution
- **Approval Workflow**: Tasks requiring human approval
- **Execution Tracking**: Tokens, cost, duration, tool calls

## Authentication & Authorization

```typescript
// All admin routes require superadmin
const { error, user } = await requireSuperadmin()
if (error) return error

// Auth flow:
// 1. getSession() - Get JWT from Supabase Auth
// 2. Check profiles.is_superadmin flag
// 3. Return AdminUser or 401/403 error
```

**Key patterns:**
- Supabase Auth with JWT tokens
- `is_superadmin` flag in profiles table
- `requireSuperadmin()` middleware on all admin routes
- `createAdminClient()` bypasses Row Level Security
- All actions logged via `logAdminAction()`

## Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (includes agent profiles) |
| `workspaces` | Customer workspaces |
| `workspace_members` | User-workspace membership |
| `workspace_api_keys` | Workspace API credentials |
| `global_feature_flags` | Platform feature toggles |
| `admin_audit_logs` | Admin action history |

### Agent System Tables
| Table | Purpose |
|-------|---------|
| `ai_agents` | Agent definitions |
| `agent_tools` | Tool definitions |
| `ai_agent_tools` | Agent-tool assignments |
| `agent_skills` | Skill definitions |
| `ai_agent_skills` | Agent-skill assignments |
| `agent_mind` | Mind file content |
| `agent_rules` | Behavioral rules |
| `agent_versions` | Version snapshots |
| `agent_prompt_sections` | Modular prompt sections |
| `agent_schedules` | Scheduled task definitions |
| `agent_schedule_executions` | Task execution records |

### Team System Tables
| Table | Purpose |
|-------|---------|
| `teams` | Team templates |
| `team_agents` | Agent-team membership |
| `team_delegations` | Agent delegation rules |
| `team_mind` | Team-level mind files |
| `plans` | Subscription plans |
| `workspace_deployed_teams` | Active deployments |
| `channels` | Communication channels |
| `channel_members` | Channel membership |

## API Patterns

### Standard REST Pattern
```typescript
// GET - List with filtering
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const supabase = createAdminClient()

  let query = supabase.from('table').select('*')
  // Apply filters from searchParams

  const { data, error: dbError } = await query
  return NextResponse.json({ items: data })
}

// POST - Create with validation
export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const body = await request.json()
  // Validate required fields

  const { data, error: dbError } = await supabase
    .from('table')
    .insert({ ... })
    .select()
    .single()

  await logAdminAction(user.id, 'created', 'table', data.id, { ... }, request)
  return NextResponse.json({ item: data }, { status: 201 })
}
```

### Pagination
```typescript
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '50')
const offset = (page - 1) * limit

query = query.range(offset, offset + limit - 1)
```

### Search
```typescript
const search = searchParams.get('search')
if (search) {
  query = query.ilike('name', `%${search}%`)
}
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/admin-auth.ts` | `requireSuperadmin()`, `logAdminAction()` |
| `src/lib/supabase/admin.ts` | RLS-bypassing Supabase client |
| `src/lib/deployment.ts` | Team deployment orchestration |
| `src/types/agents.ts` | Agent, Tool, Skill, Rule types |
| `src/types/teams.ts` | Team, Plan, Deployment types |
| `src/app/admin/layout.tsx` | Admin shell with sidebar |
| `src/components/admin/admin-sidebar.tsx` | Navigation menu |

## Deployment Flow

```
Team Template → buildConfigSnapshot() → Deploy to Workspace
                                             ↓
                              workspace_deployed_teams
                                             ↓
                              setupAgentResources()
                                   ↓         ↓
                            Agent Profiles  Agent Channels
```

**Deployment features:**
- Snapshot-based (base_config immutable)
- Per-workspace customizations (agent toggles, overrides)
- Upgrade preserves customizations
- Full cleanup on undeploy

## SDK Configuration Export

Agents export to SDK-compatible format:
```typescript
interface AgentSDKConfig {
  name: string
  model: SDKModelName  // claude-sonnet-4-5-20250929, etc.
  systemPrompt: string
  maxTurns: number
  permissionMode: PermissionMode
  tools: SDKTool[]
  skills?: SDKSkill[]
  rules?: SDKRule[]
  mind?: SDKMind[]
  delegations?: SDKDelegation[]
}
```

## Adding New Features

### New Admin Page
1. Create `src/app/admin/[feature]/page.tsx`
2. Create API route `src/app/api/admin/[feature]/route.ts`
3. Add navigation in `src/components/admin/admin-sidebar.tsx`

### New Agent Capability
1. Add type definitions in `src/types/agents.ts`
2. Create migration in `supabase/migrations/`
3. Add API routes for CRUD operations
4. Update SDK config export in agent detail route
