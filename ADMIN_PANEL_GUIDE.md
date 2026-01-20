# Admin Panel Implementation Guide

This document provides a comprehensive guide for building an admin panel for the FinanceBro application.

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Database Changes](#database-changes)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Implementation Steps](#implementation-steps)
7. [Security Considerations](#security-considerations)
8. [Testing](#testing)

---

## Overview

### What the Admin Panel Should Do

The admin panel provides system-wide management capabilities for platform administrators:

| Feature | Description |
|---------|-------------|
| **User Management** | View, suspend, and manage all users across the platform |
| **Workspace Management** | Monitor and manage all workspaces |
| **Subscription & Billing** | Manage plans, quotas, and feature access |
| **Feature Flags** | Global and per-workspace feature toggles |
| **System Analytics** | Platform-wide usage metrics and health |
| **Audit Logs** | Track admin actions and user activity |
| **API Key Management** | Monitor and revoke API keys system-wide |
| **Teams Management** | Create and manage agent teams with delegation workflows |

### Architecture Decision: Separate App vs Integrated

**Option A: Integrated Admin Section** (Recommended)
- Add `/admin` routes to existing finance app
- Reuse existing components and auth
- Simpler deployment and maintenance

**Option B: Separate Admin App**
- Create `apps/admin` in the monorepo
- Complete isolation from user-facing app
- Better for larger teams or stricter security requirements

This guide assumes **Option A** (integrated approach).

---

## Feature Overview & Use Cases

This section explains each admin capability, why it matters for FinanceBro, and when you'd use it to help customers.

### User Management

**What it does:** View, search, and manage all customer accounts across the platform. Look up any user by email, name, or ID. See their account status, linked workspaces, and activity history.

**Why it matters:** When customers reach out with account issues, you need fast access to their account details to diagnose and resolve problems. This is your primary tool for customer support.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| Customer can't log in | Look up account → Check if suspended or locked → Verify phone number → Reset auth if needed |
| Customer requests account deletion | Search by email → Verify identity (ask security questions) → Remove from workspaces → Delete or anonymize |
| Security concern (suspicious login) | Find account → Review recent activity → Suspend account → Contact customer to verify |
| Customer says they're not receiving OTP | Look up account → Verify phone number format → Check if number is valid |
| VIP customer needs special handling | Look up account → Note their workspace/subscription status → Prioritize accordingly |

---

### User Activity Logs

**What it does:** View a timeline of actions a customer has taken—connected a bank, ran a sync, deleted a transaction, changed settings, etc. You see *what they did*, not their actual financial data.

**Why it matters:** When customers report issues, you need to understand what happened without accessing their private financial information. Action logs let you troubleshoot while respecting privacy.

**Privacy note:** Admins should NOT see actual bank balances, transaction amounts, or account numbers. Only action metadata (timestamps, action types, success/failure status).

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| "My transactions aren't showing up" | Check if they triggered a sync recently → See if sync succeeded or failed → Guide them to re-sync or re-auth |
| "Something changed and I didn't do it" | Review their action log → Show them the timestamp and action → Determine if it was them or investigate further |
| Customer reports a bug | Look at their recent actions → Identify what they did before the issue → Help reproduce for engineering |
| "When did I connect my bank?" | Pull their action history → Find the bank connection event → Provide the date |

---

### Workspace Management

**What it does:** Oversee all workspaces—view their settings, members, permissions, and feature configurations.

**Why it matters:** FinanceBro uses workspaces for teams and businesses. Access issues, permission problems, and team onboarding often require admin intervention.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| "I can't access my team's workspace" | Look up workspace → Check if customer is a member → Verify their role has correct permissions |
| Team admin left the company | Find workspace → Identify remaining admins → Transfer ownership if needed |
| New team onboarding issues | Review workspace setup → Check member invites → Verify permissions for new members |
| Business needs account audit | Pull workspace details → List all members and roles → Export activity history |
| Workspace hitting limits | Check workspace quotas → Review usage → Upgrade plan or adjust limits |

---

### Subscription & Billing

**What it does:** Manage customer subscription plans, feature access levels, and billing status. Enable feature trials, handle payment issues, and process plan changes.

**Why it matters:** Revenue and customer retention depend on smooth billing experiences. Quick resolution of billing issues prevents churn.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| "I want to upgrade my plan" | Look up subscription → Show available plans → Apply change (immediate or next cycle) |
| Payment failed | Check billing status → View payment history → Extend grace period if needed → Help update payment method |
| "Can I try the premium feature?" | Find their account → Enable feature flag for trial period → Set expiration date |
| Customer disputing charge | Review payment history → Check what was billed and when → Process refund if warranted |
| Enterprise customer negotiating | View current plan → Check usage metrics → Prepare custom plan proposal |

---

### Support Tools (Audit Logs & Activity)

**What it does:** View detailed audit logs showing every significant action—who did what, when, and from where. Essential for investigations and disputes.

**Why it matters:** When customers dispute actions or report suspicious activity, you need an authoritative record of what actually happened.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| "I didn't delete that transaction" | Check audit log for deletion event → Show timestamp, IP, and user agent → Determine if customer or someone else |
| Suspicious account activity | Pull activity timeline → Look for unusual patterns (new locations, rapid changes) → Secure account if compromised |
| Customer debugging their own actions | Share relevant audit entries → Help them understand what happened |
| Compliance/legal request | Export audit logs for date range → Filter by user or action type → Provide documentation |
| Investigating a bug report | Review customer's recent actions → Identify what triggered the issue → Reproduce or escalate to engineering |

---

### System Health & Monitoring

**What it does:** Monitor platform-wide health metrics—API response times, error rates, integration status, and usage trends.

**Why it matters:** Proactive monitoring catches issues before customers report them. When something breaks, you need to know the scope immediately.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| Multiple customers reporting same issue | Check system health dashboard → Identify if widespread problem → Escalate or communicate status |
| Plaid/Nylas integration down | View integration health → Check error rates → Notify affected customers → Monitor for recovery |
| Slow performance complaints | Review API response times → Check database metrics → Identify bottleneck → Escalate if needed |
| Preparing for big launch/promotion | Review current capacity → Check for any degradation → Ensure system is healthy before traffic spike |
| Monthly health report | Export key metrics → Summarize uptime, errors, usage trends → Share with team |

---

### API Key Management

**What it does:** View and manage API keys across all workspaces. Revoke compromised keys, monitor usage, and troubleshoot integration issues.

**Why it matters:** API keys are security-sensitive. Quick revocation of compromised keys and visibility into usage patterns protects customers and the platform.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| Customer reports API key leaked | Find the key → Revoke immediately → Help customer generate new key → Check for unauthorized usage |
| Customer's integration stopped working | Look up their API keys → Check if expired or revoked → Verify usage patterns |
| Suspicious API activity | Review API key usage metrics → Look for unusual patterns → Contact customer to verify |
| Customer needs usage report | Pull API call metrics for their keys → Export for their review |

---

### Teams Management

**What it does:** Create and manage agent teams that group multiple AI agents together. Define team composition, designate head agents, configure delegation rules, and assign shared knowledge (mind files).

**Why it matters:** Teams enable multi-agent workflows where specialized agents collaborate. A head agent coordinates the team, delegating tasks based on conditions you define.

**Common Use Cases:**

| Scenario | What to do |
|----------|-----------|
| Create a new product tier | Build a team → Add relevant agents → Set head agent → Configure delegations |
| Agent not being delegated to | Check team delegations → Verify delegation conditions → Ensure agent is enabled |
| Team not functioning well | View Overview tab → Check health metrics → Verify head agent assigned |
| Customer needs different agent mix | Edit team → Add/remove agents → Update delegations |

#### Team Detail Page

The team detail page has 5 tabs for managing all aspects of a team:

**Overview Tab:**
- **Health Metrics (4 cards):**
  - Agents count: Shows number of agents in the team with status indicator (green ≥2, yellow =1, red =0)
  - Head Agent: Shows whether a head agent is assigned (green = Yes, red = No)
  - Delegations count: Shows number of delegation rules configured
  - Configuration %: Shows percentage of agents with descriptions configured
- **Team Structure visual:** Displays head agent at top with crown icon, team members below. Click any agent to navigate to their detail page.
- **Delegation Flow:** Visual list showing from→to handoffs with conditions displayed
- **Collapsible Settings section:** Edit team name, slug, description, head agent, and active status

**Agents Tab:**
- Displays all available agents with checkboxes for selection
- Shows agent model, description, and enabled status
- "Make Head" button to designate head agent
- Save button persists team agent changes

**Delegations Tab:**
- **Add delegation form:** Select from agent, to agent, condition (when to delegate), and context template
- **Delegations table:** Shows all configured delegations with delete option
- Requires at least 2 agents in team to configure delegations

**Plans Tab:**
- Read-only list of plans that use this team
- Links to plan detail pages
- Cannot modify plans from team page—edit in Plans section

**Mind Tab:**
- **Assign Existing:** Select from available mind files in the library
- **Create New:** Create a new mind file that's automatically assigned to the team
- Toggle enable/disable for each assigned mind file
- Remove mind files from team

---

## Current Architecture

### Existing Role System

Currently, all roles are **workspace-scoped**:

```
owner  → Full workspace control
admin  → Can manage members, permissions (limited)
member → Default user access
```

**There is NO global admin role.** This needs to be added.

### Key Files

| File | Purpose |
|------|---------|
| `apps/finance/middleware.ts` | Route protection, auth checks |
| `apps/finance/src/lib/workspace-auth.ts` | Workspace role validation |
| `apps/finance/src/lib/api-auth.ts` | API authentication (session + API key) |
| `packages/database/server.ts` | `createAdminClient()` for bypassing RLS |

### Database Structure

The system uses Supabase with Row Level Security (RLS). Key tables:

- `profiles` - User accounts
- `workspaces` - Tenant workspaces
- `workspace_members` - User-workspace relationships with roles
- `workspace_permissions` - Granular permission settings
- `workspace_feature_flags` - Feature toggles per workspace
- `workspace_api_keys` - API keys for integrations

---

## Database Changes

### Step 1: Add Superadmin Role to Profiles

Create migration `supabase/migrations/047_add_superadmin_role.sql`:

```sql
-- Add is_superadmin flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_superadmin
ON profiles(is_superadmin)
WHERE is_superadmin = true;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'workspace', 'api_key', etc.
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying audit logs
CREATE INDEX idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- RLS policy: Only superadmins can view audit logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all audit logs"
ON admin_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_superadmin = true
  )
);

CREATE POLICY "System can insert audit logs"
ON admin_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);
```

### Step 2: Add Global Feature Flags Table

```sql
-- Global feature flags (not workspace-scoped)
CREATE TABLE IF NOT EXISTS global_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default global flags
INSERT INTO global_feature_flags (feature_key, is_enabled, description) VALUES
  ('maintenance_mode', false, 'Put the entire platform in maintenance mode'),
  ('new_user_registration', true, 'Allow new user registrations'),
  ('api_access_global', true, 'Enable API access platform-wide'),
  ('ai_features', true, 'Enable AI-powered features');
```

### Step 3: Add System Metrics Table

```sql
-- System metrics for admin dashboard
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_type_date
ON system_metrics(metric_type, recorded_at DESC);
```

---

## API Endpoints

### Admin Authentication Helper

Create `apps/finance/src/lib/admin-auth.ts`:

```typescript
import { getSession } from '@repo/auth/session';
import { createAdminClient } from '@repo/database/server';
import { NextResponse } from 'next/server';

export async function requireSuperadmin() {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null
    };
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, is_superadmin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_superadmin) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null
    };
  }

  return { error: null, user: profile };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
  request?: Request
) {
  const supabase = createAdminClient();

  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    ip_address: request?.headers.get('x-forwarded-for') || null,
    user_agent: request?.headers.get('user-agent') || null,
  });
}
```

### Admin API Routes

Create these routes under `apps/finance/src/app/api/admin/`:

#### Users Management

**`/api/admin/users/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const { error, user } = await requireSuperadmin();
  if (error) return error;

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';

  let query = supabase
    .from('profiles')
    .select(`
      id, email, name, phone, avatar_url,
      is_superadmin, created_at, updated_at,
      workspace_members(
        workspace:workspaces(id, name, slug),
        role
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data: users, count, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    users,
    pagination: { page, limit, total: count }
  });
}
```

**`/api/admin/users/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth';

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin();
  if (error) return error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: user, error: dbError } = await supabase
    .from('profiles')
    .select(`
      *,
      workspace_members(
        workspace:workspaces(*),
        role, joined_at, allowed_products
      )
    `)
    .eq('id', id)
    .single();

  if (dbError) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Only allow specific fields to be updated
  const allowedFields = ['is_superadmin', 'name'];
  const updates: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data: user, error: dbError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await logAdminAction(admin!.id, 'user_updated', 'user', id, updates, request);

  return NextResponse.json({ user });
}

// DELETE /api/admin/users/[id] - Suspend/delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: admin } = await requireSuperadmin();
  if (error) return error;

  const { id } = await params;
  const supabase = createAdminClient();

  // Soft delete: Remove from all workspaces
  await supabase
    .from('workspace_members')
    .delete()
    .eq('profile_id', id);

  await logAdminAction(admin!.id, 'user_suspended', 'user', id, {}, request);

  return NextResponse.json({ success: true });
}
```

#### Workspaces Management

**`/api/admin/workspaces/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin } from '@/lib/admin-auth';

// GET /api/admin/workspaces - List all workspaces
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const { data: workspaces, count, error: dbError } = await supabase
    .from('workspaces')
    .select(`
      *,
      owner:profiles!workspaces_owner_id_fkey(id, email, name),
      workspace_members(count),
      workspace_feature_flags(feature_key, is_enabled)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    workspaces,
    pagination: { page, limit, total: count }
  });
}
```

#### Feature Flags

**`/api/admin/feature-flags/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth';

// GET /api/admin/feature-flags - List global feature flags
export async function GET() {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const supabase = createAdminClient();
  const { data: flags, error: dbError } = await supabase
    .from('global_feature_flags')
    .select('*')
    .order('feature_key');

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ flags });
}

// PUT /api/admin/feature-flags - Update feature flag
export async function PUT(request: NextRequest) {
  const { error, user: admin } = await requireSuperadmin();
  if (error) return error;

  const body = await request.json();
  const { feature_key, is_enabled, config } = body;

  const supabase = createAdminClient();
  const { data: flag, error: dbError } = await supabase
    .from('global_feature_flags')
    .update({ is_enabled, config, updated_at: new Date().toISOString() })
    .eq('feature_key', feature_key)
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await logAdminAction(
    admin!.id,
    'feature_flag_updated',
    'feature_flag',
    null,
    { feature_key, is_enabled },
    request
  );

  return NextResponse.json({ flag });
}
```

#### Audit Logs

**`/api/admin/audit-logs/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin } from '@/lib/admin-auth';

// GET /api/admin/audit-logs - List audit logs
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const targetType = searchParams.get('target_type');

  let query = supabase
    .from('admin_audit_logs')
    .select(`
      *,
      admin:profiles!admin_audit_logs_admin_id_fkey(id, email, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (targetType) {
    query = query.eq('target_type', targetType);
  }

  const { data: logs, count, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    logs,
    pagination: { page, limit, total: count }
  });
}
```

#### System Analytics

**`/api/admin/analytics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@repo/database/server';
import { requireSuperadmin } from '@/lib/admin-auth';

// GET /api/admin/analytics - System-wide analytics
export async function GET() {
  const { error } = await requireSuperadmin();
  if (error) return error;

  const supabase = createAdminClient();

  // Get counts in parallel
  const [
    { count: totalUsers },
    { count: totalWorkspaces },
    { count: activeApiKeys },
    { data: recentSignups },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('workspace_api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_revoked', false),
    supabase.from('profiles')
      .select('id, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    overview: {
      totalUsers: totalUsers || 0,
      totalWorkspaces: totalWorkspaces || 0,
      activeApiKeys: activeApiKeys || 0,
      newUsersLast30Days: recentSignups?.length || 0,
    },
    charts: {
      signupsByDay: aggregateByDay(recentSignups || []),
    },
  });
}

function aggregateByDay(items: { created_at: string }[]) {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const day = item.created_at.split('T')[0];
    counts[day] = (counts[day] || 0) + 1;
  });
  return Object.entries(counts).map(([date, count]) => ({ date, count }));
}
```

### Complete API Endpoint Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | List all users with pagination |
| `/api/admin/users/[id]` | GET | Get user details |
| `/api/admin/users/[id]` | PATCH | Update user (superadmin flag, etc.) |
| `/api/admin/users/[id]` | DELETE | Suspend user |
| `/api/admin/workspaces` | GET | List all workspaces |
| `/api/admin/workspaces/[id]` | GET | Get workspace details |
| `/api/admin/workspaces/[id]` | PATCH | Update workspace settings |
| `/api/admin/workspaces/[id]` | DELETE | Delete workspace |
| `/api/admin/feature-flags` | GET | List global feature flags |
| `/api/admin/feature-flags` | PUT | Update feature flag |
| `/api/admin/api-keys` | GET | List all API keys |
| `/api/admin/api-keys/[id]` | DELETE | Revoke API key |
| `/api/admin/audit-logs` | GET | View audit logs |
| `/api/admin/analytics` | GET | System analytics dashboard |
| `/api/admin/teams` | GET | List all teams |
| `/api/admin/teams` | POST | Create new team |
| `/api/admin/teams/[id]` | GET | Get team with agents, delegations, plans, and mind |
| `/api/admin/teams/[id]` | PATCH | Update team settings |
| `/api/admin/teams/[id]` | DELETE | Delete team (blocked if plans reference it) |
| `/api/admin/teams/[id]/agents` | PUT | Update team agents (add/remove/reorder) |
| `/api/admin/teams/[id]/delegations` | PUT | Update team delegations |
| `/api/admin/teams/[id]/mind` | GET | Get team mind files |
| `/api/admin/teams/[id]/mind` | PUT | Assign mind files to team |
| `/api/admin/teams/[id]/mind` | POST | Create new mind file for team |
| `/api/admin/teams/[id]/mind` | DELETE | Remove mind file from team |

---

## UI Components

### Admin Layout

Create `apps/finance/src/app/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getSession } from '@repo/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_superadmin) {
    redirect('/'); // Redirect non-admins to main app
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

### Admin Sidebar

Create `apps/finance/src/components/admin/admin-sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, Building2, Flag, Key, Bot, UsersRound, CreditCard,
  BarChart3, ScrollText, Settings, Shield
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: Flag },
  { href: '/admin/api-keys', label: 'API Keys', icon: Key },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const agentBuilderItems = [
  { href: '/admin/agents', label: 'Agents', icon: Bot },
  { href: '/admin/teams', label: 'Teams', icon: UsersRound },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  // ... additional agent builder items
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Admin Panel</span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Agent Builder Section */}
        <div className="mt-6">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Builder
          </p>
          <div className="space-y-1">
            {agentBuilderItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
```

### Admin Dashboard Page

Create `apps/finance/src/app/admin/page.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import { Users, Building2, Key, TrendingUp } from 'lucide-react';

async function getAnalytics() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/analytics`, {
    cache: 'no-store',
  });
  return res.json();
}

export default async function AdminDashboard() {
  const { overview } = await getAnalytics();

  const stats = [
    { label: 'Total Users', value: overview.totalUsers, icon: Users },
    { label: 'Workspaces', value: overview.totalWorkspaces, icon: Building2 },
    { label: 'Active API Keys', value: overview.activeApiKeys, icon: Key },
    { label: 'New Users (30d)', value: overview.newUsersLast30Days, icon: TrendingUp },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add charts, recent activity, etc. */}
    </div>
  );
}
```

### Users List Page

Create `apps/finance/src/app/admin/users/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@repo/ui/input';
import { Badge } from '@repo/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email: string;
  name: string | null;
  is_superadmin: boolean;
  created_at: string;
  workspace_members: { workspace: { name: string }; role: string }[];
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.original.name || '—',
  },
  {
    accessorKey: 'is_superadmin',
    header: 'Role',
    cell: ({ row }) => (
      row.original.is_superadmin
        ? <Badge variant="destructive">Superadmin</Badge>
        : <Badge variant="secondary">User</Badge>
    ),
  },
  {
    accessorKey: 'workspace_members',
    header: 'Workspaces',
    cell: ({ row }) => row.original.workspace_members?.length || 0,
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) => formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true }),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [search]);

  async function fetchUsers() {
    setLoading(true);
    const params = new URLSearchParams({ search });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
      />
    </div>
  );
}
```

---

## Implementation Steps

### Phase 1: Database Setup

1. **Create migration file** `supabase/migrations/047_add_superadmin_role.sql`
2. **Run migration**: `supabase db push`
3. **Manually set yourself as superadmin**:
   ```sql
   UPDATE profiles SET is_superadmin = true WHERE email = 'your@email.com';
   ```

### Phase 2: Authentication Layer

1. Create `apps/finance/src/lib/admin-auth.ts`
2. Update middleware to recognize admin routes
3. Add admin layout with auth check

### Phase 3: API Endpoints

Create endpoints in this order:

1. `/api/admin/analytics` - Dashboard data
2. `/api/admin/users` - User management
3. `/api/admin/workspaces` - Workspace management
4. `/api/admin/feature-flags` - Feature toggles
5. `/api/admin/api-keys` - API key management
6. `/api/admin/audit-logs` - Audit trail

### Phase 4: UI Components

1. Create admin layout and sidebar
2. Build dashboard page with stats
3. Implement users list with data table
4. Implement workspaces list
5. Build feature flags management
6. Add audit logs viewer

### Phase 5: Polish & Testing

1. Add loading states and error handling
2. Implement pagination
3. Add search and filters
4. Write E2E tests
5. Security audit

---

## Security Considerations

### Authentication

- **Double-check superadmin status** on every request
- Use `createAdminClient()` to bypass RLS safely
- Never expose superadmin endpoints to regular users

### Authorization

```typescript
// Always verify superadmin at the start of every admin route
const { error, user } = await requireSuperadmin();
if (error) return error;
```

### Audit Logging

- Log ALL admin actions with:
  - Who performed the action
  - What was changed
  - When it happened
  - IP address and user agent

### Data Protection

- Never expose sensitive data (password hashes, API key secrets)
- Sanitize user input
- Rate limit admin endpoints
- Use HTTPS only

### Best Practices

1. **Principle of least privilege** - Only grant superadmin to essential personnel
2. **Regular audits** - Review audit logs weekly
3. **Two-factor authentication** - Require 2FA for superadmin accounts
4. **Session management** - Short session timeouts for admin panel
5. **IP whitelisting** - Consider restricting admin access by IP

---

## Testing

### E2E Tests

Create `apps/finance/e2e/admin.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as superadmin
    await page.goto('/login');
    // ... login flow
  });

  test('dashboard shows stats', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Workspaces')).toBeVisible();
  });

  test('can view users list', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table')).toBeVisible();
  });

  test('non-admin cannot access', async ({ page }) => {
    // Login as regular user
    await page.goto('/admin');
    await expect(page).toHaveURL('/'); // Redirected
  });
});
```

### Run Tests

```bash
pnpm --filter=@repo/finance test:e2e
```

---

## File Structure Summary

```
apps/finance/src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx           # Admin layout with auth
│   │   ├── page.tsx             # Dashboard
│   │   ├── users/
│   │   │   ├── page.tsx         # Users list
│   │   │   └── [id]/page.tsx    # User details
│   │   ├── workspaces/
│   │   │   ├── page.tsx         # Workspaces list
│   │   │   └── [id]/page.tsx    # Workspace details
│   │   ├── feature-flags/
│   │   │   └── page.tsx         # Feature flags
│   │   ├── api-keys/
│   │   │   └── page.tsx         # API keys
│   │   ├── audit-logs/
│   │   │   └── page.tsx         # Audit logs
│   │   ├── settings/
│   │   │   └── page.tsx         # Admin settings
│   │   └── teams/
│   │       ├── page.tsx         # Teams list
│   │       └── [id]/page.tsx    # Team detail with Overview visualization
│   └── api/
│       └── admin/
│           ├── analytics/route.ts
│           ├── users/route.ts
│           ├── users/[id]/route.ts
│           ├── workspaces/route.ts
│           ├── workspaces/[id]/route.ts
│           ├── feature-flags/route.ts
│           ├── api-keys/route.ts
│           ├── api-keys/[id]/route.ts
│           ├── audit-logs/route.ts
│           ├── teams/route.ts
│           ├── teams/[id]/route.ts
│           ├── teams/[id]/agents/route.ts
│           ├── teams/[id]/delegations/route.ts
│           └── teams/[id]/mind/route.ts
├── components/
│   └── admin/
│       ├── admin-sidebar.tsx
│       ├── admin-stats-cards.tsx
│       └── admin-user-table.tsx
└── lib/
    └── admin-auth.ts            # Admin auth helpers

supabase/migrations/
└── 047_add_superadmin_role.sql  # Database changes
```

---

## Team Deployment System

The deployed instance model separates **team templates** (what admins build) from **deployed instances** (what workspaces run).

### Architecture

```
TEMPLATE (Admin Panel)              DEPLOYED INSTANCE (Per Workspace)
──────────────────────              ────────────────────────────────
teams                               workspace_deployed_teams
├── team_agents                     ├── workspace_id
├── team_delegations                ├── source_team_id
├── team_mind                       ├── source_version
└── (editable template)             ├── base_config (JSONB snapshot)
                                    ├── customizations (workspace overrides)
                                    ├── active_config (computed)
                                    └── status (active/paused/replaced)
```

### Deployment Flow

1. **Admin creates team template** - In Teams section, add agents, delegations, and mind
2. **Deploy to workspaces** - From team's "Deployments" tab, select workspaces
3. **Config snapshot created** - Full team config is captured as JSONB
4. **Workspace receives deployment** - Shows in workspace's "Team" tab
5. **Workspace can customize** - Disable agents, add mind, modify delegations
6. **Runtime loads active_config** - Railway agent-server loads from `workspace_deployed_teams`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/teams/[id]/deploy` | POST | Deploy team to workspace(s) |
| `/api/admin/teams/[id]/deployments` | GET | List all deployments of a team |
| `/api/admin/workspaces/[id]/deployed-team` | GET | Get workspace's deployed config |
| `/api/admin/workspaces/[id]/deployed-team` | PATCH | Update customizations |
| `/api/admin/workspaces/[id]/deployed-team` | DELETE | Undeploy team |
| `/api/admin/workspaces/[id]/deployed-team/reset` | POST | Reset to template defaults |
| `/api/admin/workspaces/[id]/deployed-team/upgrade` | POST | Upgrade to latest template version |

### Customizations

Workspaces can customize their deployment without modifying the template:

```typescript
interface Customizations {
  disabled_agents: string[]        // Agent slugs to disable
  disabled_delegations: string[]   // Delegation IDs to disable
  added_mind: Mind[]               // Workspace-specific mind files
  agent_overrides: Record<string, Partial<Agent>>  // Per-agent tweaks
}
```

### Version Management

- Templates have a `current_version` that auto-increments on changes
- Deployments track `source_version` to detect when updates are available
- "Upgrade" applies new template while preserving customizations
- "Reset" clears customizations and reverts to base config

### Auto-Deploy on Workspace Creation

When a workspace is created with a plan that has a team assigned, the team is automatically deployed:

```typescript
// Called during workspace creation
await autoDeployTeamForWorkspace(workspaceId, planId)
```

### Database Schema

The `workspace_deployed_teams` table stores deployments:

```sql
CREATE TABLE workspace_deployed_teams (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  source_team_id UUID REFERENCES teams(id),
  source_version INTEGER,
  base_config JSONB,      -- Snapshot at deploy time
  customizations JSONB,   -- Workspace overrides
  active_config JSONB,    -- Computed: base + customizations
  status TEXT,            -- active, paused, replaced
  deployed_at TIMESTAMPTZ,
  -- Unique constraint: one active deployment per workspace
);
```

---

## Next Steps

After implementing the admin panel:

1. **Add more analytics** - Charts, graphs, trends
2. **Implement bulk actions** - Mass user operations
3. **Add email notifications** - Alert admins of suspicious activity
4. **Create admin API** - For automated admin tasks
5. **Build reports** - Exportable user/workspace reports
6. **Add impersonation** - Allow admins to view as specific users (with audit trail)
