# Admin Workspace Guide

This guide explains what workspaces are, what they contain, and what platform admins (superadmins) can do to manage them.

---

## What is a Workspace?

A **workspace** is the core organizational unit in FinanceBro. Think of it like a Slack workspace or a Notion team—it's a container that holds all of a team's data, completely isolated from other workspaces.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Data Isolation** | Each workspace has its own accounts, transactions, CRM, projects, messages, etc. |
| **Multi-tenancy** | Users can belong to multiple workspaces but work in one at a time |
| **Team-based** | Designed for teams/companies, with roles and permissions |
| **Self-contained** | Everything a team needs is within their workspace |

### Workspace Identity

| Field | Description | Editable |
|-------|-------------|----------|
| **Name** | Display name (e.g., "Acme Corp") | Yes |
| **Slug** | URL identifier (e.g., `acme-corp`) | No (set at creation) |
| **Description** | Optional description | Yes |
| **Avatar** | Logo/icon URL | Yes |
| **Owner** | The user who created it | No (cannot transfer) |

---

## What's Inside a Workspace

Each workspace contains isolated instances of all FinanceBro features:

### Finance Module

| Data | Description |
|------|-------------|
| **Accounts** | Bank accounts, credit cards, investment accounts |
| **Transactions** | All financial transactions |
| **Categories** | Custom + system expense/income categories |
| **Budgets** | Spending budgets by category |
| **Subscriptions** | Tracked recurring bills |
| **Goals** | Financial goals (revenue, profit, valuation) |
| **Recurring Rules** | Auto-generated transaction patterns |

### CRM & Sales

| Data | Description |
|------|-------------|
| **Leads** | Sales prospects |
| **Contacts** | People/customers |
| **Pipelines** | Sales pipeline stages |
| **Deals** | Active opportunities |
| **Activities** | Calls, meetings, emails, tasks |

### Team & Messaging

| Data | Description |
|------|-------------|
| **Channels** | Team chat channels (public/private) |
| **Messages** | All channel and DM messages |
| **DM Conversations** | Direct message threads |
| **Files** | Uploaded files and attachments |

### Projects

| Data | Description |
|------|-------------|
| **Projects** | Project containers |
| **Tasks** | Task items with status, priority, assignees |
| **Milestones** | Project milestones |
| **Comments** | Task discussions |

### Knowledge Base

| Data | Description |
|------|-------------|
| **Pages** | Wiki-style documentation |
| **Whiteboards** | Visual diagrams (Excalidraw) |
| **Templates** | Reusable page templates |

### Integrations

| Data | Description |
|------|-------------|
| **Plaid Items** | Connected bank accounts |
| **Nylas Grants** | Email/calendar connections |
| **Twilio Numbers** | Phone numbers for calling/SMS |
| **API Keys** | Programmatic access tokens |
| **Workflows** | Automation rules |

### AI & Agents

| Data | Description |
|------|-------------|
| **Agents** | Custom AI assistants |
| **Skills** | Agent capabilities |
| **Conversations** | Agent chat history |

---

## Member Roles & Permissions

### Role Hierarchy

```
Owner (1 per workspace)
  ↓
Admin (multiple)
  ↓
Member (multiple)
```

### Role Capabilities

| Capability | Owner | Admin | Member |
|------------|-------|-------|--------|
| Full workspace access | ✅ | ✅ | ✅ |
| Invite new members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌* | ❌ |
| Manage product access | ✅ | ✅ | ❌ |
| Delete workspace content | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ |
| Import data | ✅ | ❌ | ❌ |
| Edit workspace settings | ✅ | ❌ | ❌ |
| Manage integrations | ✅ | ❌ | ❌ |
| Configure permissions | ✅ | ❌ | ❌ |
| Manage feature flags | ✅ | ❌ | ❌ |
| Create/revoke API keys | ✅ | ✅ | ❌ |

*Admins can change members to/from member role, but not admin role

### Product Access

Each member can be granted access to specific products:

- `finance` - Financial tracking
- `sales` - CRM and deals
- `team` - Messaging and collaboration
- `projects` - Project management
- `knowledge` - Knowledge base

---

## Workspace Settings

### Configurable Permissions

Workspace owners can customize what admins and members can do:

| Permission Key | Description |
|----------------|-------------|
| `can_invite` | Invite new members |
| `can_remove_members` | Remove members from workspace |
| `can_change_roles` | Modify member roles |
| `can_manage_product_access` | Control which products members can access |
| `can_delete_content` | Delete workspace content |
| `can_export_data` | Export workspace data |
| `can_import_data` | Import data into workspace |
| `can_edit_workspace` | Edit workspace name, description |
| `can_manage_integrations` | Configure external integrations |

### Feature Flags

Toggle features on/off per workspace:

| Feature Key | Description | Default |
|-------------|-------------|---------|
| `ai_capabilities` | Enable AI agents and assistants | ✅ On |
| `beta_features` | Access experimental features | ❌ Off |
| `advanced_analytics` | Advanced reporting and analytics | ❌ Off |
| `api_access` | Enable API key generation | ✅ On |
| `webhook_integrations` | Enable automation webhooks | ✅ On |

---

## Admin Panel: Workspace Management

As a **superadmin**, you can view and manage all workspaces across the platform. Here's what you should be able to do:

### View Workspace List

| Column | Description |
|--------|-------------|
| Name | Workspace display name |
| Slug | URL identifier |
| Owner | Owner's name and email |
| Members | Member count |
| Created | Creation date |
| Status | Active/suspended |

### View Workspace Details

When clicking into a workspace, admins should see:

#### Overview Tab
- Workspace name, slug, description
- Owner information
- Creation date
- Member count
- Data summary (accounts, transactions, projects, etc.)

#### Members Tab
- All members with roles
- Product access per member
- Join date
- Last active date (if tracked)
- Ability to remove members

#### Settings Tab
- View current permissions matrix
- View feature flags
- View API keys (metadata only, not the keys)

#### Activity Tab
- Audit log of significant actions
- Who did what and when

### Edit Capabilities

What superadmins should be able to modify:

| Action | Use Case |
|--------|----------|
| **Edit workspace name/description** | Customer requests name change |
| **Suspend workspace** | Policy violation, non-payment |
| **Unsuspend workspace** | Issue resolved |
| **Remove member** | User locked out, needs admin removal |
| **Change member role** | Emergency access changes |
| **Revoke API keys** | Security incident |
| **Toggle feature flags** | Grant/revoke feature access |
| **Transfer ownership** | Original owner left company |
| **Delete workspace** | Customer request (with confirmation) |

### Read-Only Access

Superadmins should be able to VIEW but not EDIT:

- Financial data (accounts, transactions, balances)
- Messages and conversations
- Files and documents
- CRM data (leads, contacts, deals)

This maintains user privacy while enabling support.

---

## Common Admin Use Cases

### 1. Customer Can't Access Their Workspace

**Symptoms:** User reports they can't see their workspace after login

**Admin Actions:**
1. Look up user's profile by email
2. Check their workspace memberships
3. Verify they're a member of the workspace
4. Check if workspace is suspended
5. If missing, add them back as member

---

### 2. Workspace Owner Left the Company

**Symptoms:** Team can't make admin changes, owner is unresponsive

**Admin Actions:**
1. Verify ownership transfer request is legitimate
2. Find the workspace
3. Identify the new owner (should be existing admin)
4. Transfer ownership
5. Log the action in admin audit log

---

### 3. Security Incident - Compromised API Key

**Symptoms:** Suspicious API activity reported

**Admin Actions:**
1. Look up the workspace's API keys
2. Identify the compromised key (by prefix or last used date)
3. Revoke the key immediately
4. Review audit logs for unauthorized actions
5. Notify workspace owner

---

### 4. Customer Requesting Data Export

**Symptoms:** Customer needs all their data (GDPR, switching platforms)

**Admin Actions:**
1. Verify the request is from workspace owner
2. Generate data export
3. Provide secure download link
4. Log the export in audit trail

---

### 5. Billing Issue - Need to Restrict Features

**Symptoms:** Payment failed, need to downgrade features

**Admin Actions:**
1. Find the workspace
2. Disable premium feature flags:
   - `advanced_analytics` → Off
   - `api_access` → Off (optional)
3. Send notification to owner about downgrade
4. Log the action

---

### 6. Investigating Suspicious Activity

**Symptoms:** Unusual patterns, potential abuse

**Admin Actions:**
1. Find the workspace
2. Review audit logs for recent activity
3. Check member list for unauthorized users
4. Review API key usage
5. If abuse confirmed, suspend workspace
6. Document findings

---

### 7. Customer Support - "I Deleted Something"

**Symptoms:** User accidentally deleted important data

**Admin Actions:**
1. Check if soft-delete (is_archived, is_deleted flag)
2. If soft-deleted, restore via database
3. If hard-deleted, check backups
4. Log the restoration

---

## Database Tables Reference

Quick reference for workspace-related tables:

| Table | Purpose |
|-------|---------|
| `workspaces` | Workspace identity and settings |
| `workspace_members` | User-workspace relationships |
| `workspace_permissions` | Role-based permission overrides |
| `workspace_feature_flags` | Per-workspace feature toggles |
| `workspace_api_keys` | API access tokens |
| `workspace_files` | Uploaded files |
| `pending_invites` | Pending member invitations |
| `audit_logs` | Activity tracking |

---

## API Endpoints for Admin Panel

Existing endpoints the admin panel can use:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/workspaces` | GET | List all workspaces |
| `/api/admin/workspaces/[id]` | GET | Get workspace details |
| `/api/admin/workspaces/[id]` | PATCH | Update workspace |
| `/api/admin/workspaces/[id]` | DELETE | Delete workspace |
| `/api/admin/workspaces/[id]/members` | GET | List members |
| `/api/admin/workspaces/[id]/members/[memberId]` | DELETE | Remove member |
| `/api/admin/workspaces/[id]/api-keys` | GET | List API keys |
| `/api/admin/workspaces/[id]/api-keys/[keyId]` | DELETE | Revoke key |
| `/api/admin/workspaces/[id]/feature-flags` | GET | Get flags |
| `/api/admin/workspaces/[id]/feature-flags` | PUT | Update flags |
| `/api/admin/workspaces/[id]/audit-logs` | GET | Get activity |

*Note: These endpoints need to be created - see ADMIN_PANEL_GUIDE.md for implementation details.*

---

## Security Considerations

### What Superadmins Should NOT Do

- Access or export financial transaction details without customer consent
- Read private messages or files
- Share API keys or credentials
- Make changes without logging them
- Delete workspaces without explicit confirmation
- Access workspaces without legitimate support reason

### Audit Trail Requirements

Every admin action should log:
- Admin who performed the action
- Timestamp
- Action type
- Target workspace/user
- Before/after values (where applicable)
- IP address
- Reason (if provided)

### Privacy Principles

1. **Minimum necessary access** - Only view what's needed for support
2. **Transparency** - Users should know when admin accessed their data
3. **Immutable logs** - Admin actions can't be deleted
4. **Time-limited access** - Consider session timeouts for admin panel
