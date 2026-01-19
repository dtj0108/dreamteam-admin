# Subscription Plans

This document describes the subscription plans system that controls agent access and workspace features in the DreamTeam platform.

## Overview

Subscription plans determine which AI agents workspaces can access. Each plan tier unlocks progressively more capable agents, allowing the platform to gate advanced functionality behind higher subscription levels.

**Key relationships:**
- **Plans** define subscription tiers (Starter, Pro, Enterprise)
- **Agents** have an optional `plan_id` that restricts access
- **Workspaces** are assigned a plan, which determines available agents

## Plan Tiers

| Plan | Slug | Description | Price |
|------|------|-------------|-------|
| **Starter** | `starter` | Entry-level plan with access to basic agents | Varies |
| **Pro** | `pro` | Mid-tier plan with additional agent capabilities | Varies |
| **Enterprise** | `enterprise` | Full access to all agents and features | Custom |

### Starter
Basic agents for getting started:
- General-purpose assistants
- Simple task automation

### Pro
Everything in Starter, plus:
- Specialized department agents
- Advanced workflow automation
- Custom agent configurations

### Enterprise
Everything in Pro, plus:
- All premium agents
- Head agents for department management
- Custom agent development
- Priority support

## Plan-Agent Relationship

Agents use the `plan_id` column to control access:

| `plan_id` Value | Access |
|-----------------|--------|
| `NULL` | Available to **all** plans |
| `'starter'` | Available to Starter and above |
| `'pro'` | Available to Pro and above |
| `'enterprise'` | Available to Enterprise only |

**Access hierarchy:** Enterprise > Pro > Starter

When an agent has a `plan_id` set, only workspaces with that plan tier (or higher) can use the agent.

## Database Schema

### Plans Table

```sql
-- Plans table structure
CREATE TABLE plans (
  id TEXT PRIMARY KEY,           -- e.g., 'starter', 'pro', 'enterprise'
  name TEXT NOT NULL,            -- Display name
  slug TEXT UNIQUE NOT NULL,     -- URL-safe identifier
  description TEXT,              -- Plan description
  price_monthly NUMERIC          -- Monthly price (NULL for custom pricing)
);
```

### Agent Plan Assignment

```sql
-- From migration 070_agent_plans.sql
ALTER TABLE ai_agents
ADD COLUMN IF NOT EXISTS plan_id TEXT;

-- Index for efficient plan queries
CREATE INDEX IF NOT EXISTS idx_ai_agents_plan ON ai_agents(plan_id);

-- plan_id values: 'starter', 'pro', 'enterprise', or NULL (all plans)
```

### TypeScript Types

```typescript
// From src/types/agents.ts
interface Agent {
  id: string
  name: string
  plan_id: string | null  // Subscription plan restriction
  // ... other fields
}

interface UpdateAgentRequest {
  plan_id?: string | null  // Set plan restriction
  // ... other fields
}
```

## API Reference

### List All Plans

```http
GET /api/admin/plans
```

Returns all subscription plans ordered by price.

**Response:**
```json
{
  "plans": [
    {
      "id": "starter",
      "name": "Starter",
      "slug": "starter",
      "description": "Basic plan for getting started",
      "price_monthly": 29
    },
    {
      "id": "pro",
      "name": "Pro",
      "slug": "pro",
      "description": "Professional plan with advanced features",
      "price_monthly": 99
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "slug": "enterprise",
      "description": "Full platform access for organizations",
      "price_monthly": null
    }
  ]
}
```

**Authentication:** Requires superadmin access.

### Assign Plan to Agent

Use the agent update endpoint to set `plan_id`:

```http
PATCH /api/admin/agents/:id
Content-Type: application/json

{
  "plan_id": "pro"
}
```

Set `plan_id` to `null` to make the agent available to all plans:

```json
{
  "plan_id": null
}
```

## How to Assign Agents to Plans

### Via Admin Panel

1. Navigate to **Agents** in the admin sidebar
2. Select an agent to edit
3. In the agent settings, find the **Plan** dropdown
4. Select the minimum plan tier required
5. Save changes

### Via API

```typescript
// Example: Restrict agent to Pro tier and above
const response = await fetch('/api/admin/agents/agent-123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan_id: 'pro' })
})

// Example: Make agent available to all plans
const response = await fetch('/api/admin/agents/agent-123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan_id: null })
})
```

### Best Practices

1. **Start broad, restrict later:** New agents should generally be `NULL` (all plans) until you decide to restrict them.

2. **Consider the value proposition:** Restrict agents that provide significant business value to higher tiers.

3. **Document restrictions:** When restricting an agent, note why in the agent's description.

4. **Test access:** After changing plan assignments, verify that workspaces on different plans see the correct agent availability.

## Querying Agents by Plan

To get agents available for a specific plan:

```sql
-- Get all agents available to 'pro' plan
-- (agents with plan_id NULL, 'starter', or 'pro')
SELECT * FROM ai_agents
WHERE plan_id IS NULL
   OR plan_id IN ('starter', 'pro')
ORDER BY name;
```

```typescript
// TypeScript helper for checking agent availability
function isAgentAvailableForPlan(
  agentPlanId: string | null,
  workspacePlan: string
): boolean {
  if (agentPlanId === null) return true

  const planHierarchy = ['starter', 'pro', 'enterprise']
  const agentTier = planHierarchy.indexOf(agentPlanId)
  const workspaceTier = planHierarchy.indexOf(workspacePlan)

  return workspaceTier >= agentTier
}
```

## Related Files

| File | Description |
|------|-------------|
| `supabase/migrations/070_agent_plans.sql` | Plan assignment migration |
| `src/app/api/admin/plans/route.ts` | Plans list API endpoint |
| `src/types/agents.ts` | Agent TypeScript types including `plan_id` |
| `src/app/api/admin/agents/[id]/route.ts` | Agent update endpoint |
