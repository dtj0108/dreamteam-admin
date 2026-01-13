# Database Schema Reference

Complete reference for FinanceBro's database schema. Use this document to understand existing tables before writing new migrations.

**Last Updated:** January 2025
**Migration Count:** 57
**Database:** Supabase (PostgreSQL with RLS)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Domain](#1-core-domain)
3. [Finance Domain](#2-finance-domain)
4. [CRM Domain](#3-crm-domain)
5. [Messaging Domain](#4-messaging-domain)
6. [Projects Domain](#5-projects-domain)
7. [Knowledge Domain](#6-knowledge-domain)
8. [Integrations Domain](#7-integrations-domain)
9. [System Domain](#8-system-domain)
10. [Enums](#enums)
11. [Design Patterns](#design-patterns)
12. [RLS Policy Summary](#rls-policy-summary)
13. [Triggers & Functions](#triggers--functions)

---

## Overview

### Architecture

- **Multi-tenancy:** Workspace-based isolation for all user data
- **Authentication:** Supabase Auth with phone OTP (Twilio Verify)
- **Security:** Row-Level Security (RLS) on all user-facing tables
- **Patterns:** Soft deletes, automatic timestamps, JSONB for flexible content

### Table Count by Domain

| Domain | Tables | Description |
|--------|--------|-------------|
| Core | 4 | Users, workspaces, members, permissions |
| Finance | 10 | Accounts, transactions, budgets, goals |
| CRM | 8 | Leads, contacts, deals, pipelines |
| Messaging | 8 | Channels, messages, DMs, reactions |
| Projects | 12 | Projects, tasks, milestones, comments |
| Knowledge | 4 | Pages, whiteboards, templates, categories |
| Integrations | 6 | Plaid, Nylas, Twilio |
| System | 12 | Agents, workflows, API keys, audit logs |

---

## 1. Core Domain

Core tables for user identity, workspace organization, and team structure.

### profiles

User accounts linked to Supabase Auth.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | - | PK, references auth.users |
| email | TEXT | NO | - | Unique email address |
| phone | TEXT | YES | - | E.164 format phone number |
| name | TEXT | YES | - | Display name |
| company_name | TEXT | YES | - | Company/organization name |
| avatar_url | TEXT | YES | - | Profile image URL |
| phone_verified | BOOLEAN | YES | false | Phone verification status |
| pending_2fa | BOOLEAN | YES | false | Awaiting 2FA completion |
| default_workspace_id | UUID | YES | - | FK → workspaces |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** phone, email, default_workspace_id

---

### workspaces

Team/organization containers for multi-tenancy.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| name | VARCHAR(255) | NO | - | Workspace display name |
| slug | VARCHAR(100) | NO | - | Unique URL slug |
| avatar_url | TEXT | YES | - | Workspace logo |
| owner_id | UUID | NO | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** slug (unique), owner_id

---

### workspace_members

User membership in workspaces with roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| profile_id | UUID | NO | - | FK → profiles |
| role | VARCHAR(50) | YES | 'member' | owner, admin, member |
| display_name | VARCHAR(100) | YES | - | Workspace-specific name |
| status | VARCHAR(50) | YES | 'active' | active, away, dnd |
| status_text | VARCHAR(100) | YES | - | Custom status message |
| allowed_products | TEXT[] | YES | - | Product access list |
| joined_at | TIMESTAMPTZ | YES | NOW() | - |

**Unique:** (workspace_id, profile_id)
**Indexes:** workspace_id, profile_id

---

### workspace_permissions

Granular role-based permissions per workspace.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| role | TEXT | NO | - | Role name |
| permission | TEXT | NO | - | Permission key |
| granted | BOOLEAN | YES | true | Permission enabled |

---

## 2. Finance Domain

Personal and business financial tracking.

### accounts

Bank accounts and financial accounts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | TEXT | NO | - | Account name |
| type | account_type | YES | - | checking, savings, etc. |
| balance | DECIMAL(15,2) | YES | 0.00 | Current balance |
| institution | TEXT | YES | - | Bank name |
| last_four | TEXT | YES | - | Last 4 digits |
| currency | TEXT | YES | 'USD' | Currency code |
| is_active | BOOLEAN | YES | true | Active status |
| is_plaid_linked | BOOLEAN | YES | false | Connected via Plaid |
| plaid_item_id | UUID | YES | - | FK → plaid_items |
| plaid_account_id | TEXT | YES | - | Plaid account ID |
| plaid_available_balance | DECIMAL | YES | - | Plaid available |
| plaid_current_balance | DECIMAL | YES | - | Plaid current |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, plaid_account_id, plaid_item_id, is_plaid_linked

---

### transactions

Financial transactions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| account_id | UUID | NO | - | FK → accounts |
| category_id | UUID | YES | - | FK → categories |
| amount | DECIMAL(15,2) | NO | - | + income, - expense |
| date | DATE | YES | CURRENT_DATE | Transaction date |
| description | TEXT | NO | - | Merchant/description |
| notes | TEXT | YES | - | User notes |
| is_transfer | BOOLEAN | YES | - | Transfer flag |
| transfer_pair_id | UUID | YES | - | FK → transactions |
| recurring_rule_id | UUID | YES | - | FK → recurring_rules |
| plaid_transaction_id | TEXT | YES | - | Plaid ID (unique) |
| plaid_pending | BOOLEAN | YES | - | Pending status |
| plaid_merchant_name | TEXT | YES | - | Plaid merchant |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** account_id, category_id, date DESC, plaid_transaction_id

---

### categories

Transaction categories (income/expense).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | YES | - | FK → workspaces (null = system) |
| name | TEXT | NO | - | Category name |
| type | category_type | YES | 'expense' | expense, income |
| icon | TEXT | YES | 'tag' | Icon identifier |
| color | TEXT | YES | '#6b7280' | Hex color |
| parent_id | UUID | YES | - | FK → categories |
| is_system | BOOLEAN | YES | false | System category |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id

---

### budgets

Spending budgets by category.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| category_id | UUID | NO | - | FK → categories |
| amount | DECIMAL(12,2) | NO | - | Budget amount (>0) |
| period | TEXT | YES | - | weekly, biweekly, monthly, yearly |
| start_date | DATE | YES | CURRENT_DATE | Period start |
| rollover | BOOLEAN | YES | false | Rollover unused |
| is_active | BOOLEAN | YES | true | Active status |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Unique:** (workspace_id, category_id)
**Indexes:** workspace_id, category_id, is_active (partial)

---

### subscriptions

Recurring subscriptions/bills.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | TEXT | NO | - | Subscription name |
| merchant_pattern | TEXT | NO | - | Merchant match pattern |
| amount | DECIMAL(15,2) | NO | - | Charge amount |
| frequency | recurring_frequency | YES | - | Billing frequency |
| next_renewal_date | DATE | NO | - | Next charge date |
| last_charge_date | DATE | YES | - | Last charge date |
| category_id | UUID | YES | - | FK → categories |
| reminder_days_before | INTEGER | YES | - | Reminder days |
| is_active | BOOLEAN | YES | true | Active status |
| is_auto_detected | BOOLEAN | YES | false | AI detected |
| notes | TEXT | YES | - | User notes |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, next_renewal_date, is_active

---

### goals

Financial goals tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| type | TEXT | YES | - | revenue, profit, valuation, runway |
| name | TEXT | NO | - | Goal name |
| target_amount | DECIMAL(15,2) | NO | - | Target value |
| current_amount | DECIMAL(15,2) | YES | 0 | Current progress |
| start_date | DATE | NO | - | Start date |
| end_date | DATE | NO | - | Target date |
| is_achieved | BOOLEAN | YES | false | Achieved flag |
| achieved_at | TIMESTAMPTZ | YES | - | Achievement date |
| notes | TEXT | YES | - | Notes |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Constraint:** end_date >= start_date
**Indexes:** workspace_id, type, is_achieved

---

### recurring_rules

Automated recurring transactions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| account_id | UUID | NO | - | FK → accounts |
| category_id | UUID | YES | - | FK → categories |
| amount | DECIMAL(15,2) | NO | - | Transaction amount |
| description | TEXT | NO | - | Description |
| frequency | recurring_frequency | YES | - | Frequency |
| next_date | DATE | NO | - | Next occurrence |
| end_date | DATE | YES | - | End date |
| is_active | BOOLEAN | YES | true | Active status |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, account_id, next_date

---

## 3. CRM Domain

Customer relationship management and sales.

### leads

Sales leads/prospects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | TEXT | NO | - | Lead/company name |
| website | TEXT | YES | - | Website URL |
| industry | TEXT | YES | - | Industry |
| status | TEXT | YES | 'new' | Lead status |
| source | TEXT | YES | - | Lead source |
| pipeline_id | UUID | YES | - | FK → lead_pipelines |
| stage_id | UUID | YES | - | FK → lead_pipeline_stages |
| assigned_to | UUID | YES | - | FK → profiles |
| notes | TEXT | YES | - | Notes |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, status, pipeline_id, stage_id, assigned_to

---

### contacts

People associated with leads or standalone.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| lead_id | UUID | YES | - | FK → leads |
| first_name | VARCHAR(100) | NO | - | First name |
| last_name | VARCHAR(100) | YES | - | Last name |
| email | VARCHAR(255) | YES | - | Email |
| phone | VARCHAR(50) | YES | - | Phone |
| company | VARCHAR(255) | YES | - | Company name |
| job_title | VARCHAR(255) | YES | - | Title |
| avatar_url | TEXT | YES | - | Photo URL |
| notes | TEXT | YES | - | Notes |
| tags | TEXT[] | YES | - | Tags array |
| source | VARCHAR(100) | YES | - | Contact source |
| is_active | BOOLEAN | YES | true | Active status |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, lead_id, email

---

### pipelines

Sales pipelines (deal-focused).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | VARCHAR(255) | NO | - | Pipeline name |
| description | TEXT | YES | - | Description |
| is_default | BOOLEAN | YES | false | Default pipeline |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id

---

### pipeline_stages

Stages within a pipeline.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| pipeline_id | UUID | NO | - | FK → pipelines |
| name | VARCHAR(100) | NO | - | Stage name |
| color | VARCHAR(20) | YES | - | Stage color |
| position | INTEGER | NO | - | Sort order |
| win_probability | INTEGER | YES | 0 | Win % (0-100) |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Indexes:** pipeline_id

---

### deals

Sales opportunities/deals.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| contact_id | UUID | YES | - | FK → contacts |
| pipeline_id | UUID | YES | - | FK → pipelines |
| stage_id | UUID | YES | - | FK → pipeline_stages |
| name | VARCHAR(255) | NO | - | Deal name |
| value | DECIMAL(15,2) | YES | - | Deal value |
| currency | VARCHAR(3) | YES | 'USD' | Currency |
| expected_close_date | DATE | YES | - | Expected close |
| actual_close_date | DATE | YES | - | Actual close |
| status | VARCHAR(50) | YES | 'open' | open, won, lost |
| probability | INTEGER | YES | - | Win probability |
| notes | TEXT | YES | - | Notes |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, stage_id, status

---

### opportunities

Lead-specific opportunities.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| lead_id | UUID | NO | - | FK → leads |
| name | TEXT | NO | - | Opportunity name |
| value | DECIMAL(15,2) | YES | - | Value |
| status | TEXT | YES | 'open' | Status |
| expected_close_date | DATE | YES | - | Expected close |
| notes | TEXT | YES | - | Notes |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, lead_id, status

---

### activities

CRM activities (calls, emails, meetings, tasks).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| contact_id | UUID | YES | - | FK → contacts |
| lead_id | UUID | YES | - | FK → leads |
| deal_id | UUID | YES | - | FK → deals |
| type | VARCHAR(50) | NO | - | call, email, meeting, note, task |
| subject | VARCHAR(255) | YES | - | Subject |
| description | TEXT | YES | - | Description |
| due_date | TIMESTAMPTZ | YES | - | Due date |
| completed_at | TIMESTAMPTZ | YES | - | Completion time |
| is_completed | BOOLEAN | YES | false | Completed flag |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, contact_id, lead_id, deal_id, type

---

## 4. Messaging Domain

Team chat and communication.

### channels

Workspace channels (public/private).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | VARCHAR(100) | NO | - | Channel name |
| description | TEXT | YES | - | Description |
| is_private | BOOLEAN | YES | false | Private channel |
| is_archived | BOOLEAN | YES | false | Archived |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Unique:** (workspace_id, name)
**Indexes:** workspace_id

---

### channel_members

Channel membership.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| channel_id | UUID | NO | - | FK → channels |
| profile_id | UUID | NO | - | FK → profiles |
| last_read_at | TIMESTAMPTZ | YES | - | Last read time |
| notifications | VARCHAR(50) | YES | 'all' | all, mentions, none |
| joined_at | TIMESTAMPTZ | YES | NOW() | - |

**Unique:** (channel_id, profile_id)
**Indexes:** channel_id, profile_id

---

### dm_conversations

Direct message conversations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

---

### dm_participants

DM conversation participants.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| conversation_id | UUID | NO | - | FK → dm_conversations |
| profile_id | UUID | NO | - | FK → profiles |
| last_read_at | TIMESTAMPTZ | YES | - | Last read time |

**Unique:** (conversation_id, profile_id)

---

### messages

Channel and DM messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| channel_id | UUID | YES | - | FK → channels |
| dm_conversation_id | UUID | YES | - | FK → dm_conversations |
| sender_id | UUID | NO | - | FK → profiles |
| parent_id | UUID | YES | - | FK → messages (thread) |
| content | TEXT | NO | - | Message content |
| is_edited | BOOLEAN | YES | false | Edited flag |
| edited_at | TIMESTAMPTZ | YES | - | Edit time |
| is_deleted | BOOLEAN | YES | false | Deleted flag |
| deleted_at | TIMESTAMPTZ | YES | - | Delete time |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Constraint:** channel_id XOR dm_conversation_id (exactly one must be set)
**Indexes:** channel_id, dm_conversation_id, sender_id, parent_id, created_at DESC

---

### message_reactions

Emoji reactions on messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| message_id | UUID | NO | - | FK → messages |
| profile_id | UUID | NO | - | FK → profiles |
| emoji | VARCHAR(50) | NO | - | Emoji character |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Unique:** (message_id, profile_id, emoji)

---

### message_attachments

Files attached to messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| message_id | UUID | NO | - | FK → messages |
| file_name | VARCHAR(255) | NO | - | File name |
| file_type | VARCHAR(100) | YES | - | MIME type |
| file_size | INTEGER | YES | - | Size in bytes |
| file_url | TEXT | NO | - | Download URL |
| storage_path | TEXT | YES | - | Storage path |
| uploaded_by | UUID | YES | - | FK → profiles |
| workspace_file_id | UUID | YES | - | FK → workspace_files |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

---

## 5. Projects Domain

Project management and task tracking.

### projects

Project containers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | TEXT | NO | - | Project name |
| description | TEXT | YES | - | Description |
| status | project_status | YES | 'active' | Status |
| priority | project_priority | YES | 'medium' | Priority |
| color | TEXT | YES | - | Display color |
| icon | TEXT | YES | - | Icon |
| start_date | DATE | YES | - | Start date |
| target_end_date | DATE | YES | - | Target end |
| actual_end_date | DATE | YES | - | Actual end |
| budget | DECIMAL(15,2) | YES | - | Budget |
| owner_id | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, status, owner_id

---

### project_members

Project team members.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | FK → projects |
| user_id | UUID | NO | - | FK → profiles |
| role | TEXT | YES | 'member' | owner, admin, member, viewer |
| hours_per_week | DECIMAL(5,2) | YES | 40 | Allocated hours |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Unique:** (project_id, user_id)

---

### tasks

Project tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | FK → projects |
| parent_id | UUID | YES | - | FK → tasks (subtask) |
| title | TEXT | NO | - | Task title |
| description | TEXT | YES | - | Description |
| status | task_status | YES | 'todo' | Status |
| priority | task_priority | YES | 'medium' | Priority |
| start_date | DATE | YES | - | Start date |
| due_date | DATE | YES | - | Due date |
| estimated_hours | DECIMAL(6,2) | YES | - | Estimated hours |
| actual_hours | DECIMAL(6,2) | YES | - | Actual hours |
| position | INTEGER | YES | - | Sort position |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** project_id, parent_id, status, due_date, created_by

---

### task_assignees

Task assignments to users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| task_id | UUID | NO | - | FK → tasks |
| user_id | UUID | NO | - | FK → profiles |
| assigned_at | TIMESTAMPTZ | YES | NOW() | - |

**Unique:** (task_id, user_id)

---

### milestones

Project milestones.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| project_id | UUID | NO | - | FK → projects |
| name | TEXT | NO | - | Milestone name |
| description | TEXT | YES | - | Description |
| target_date | DATE | NO | - | Target date |
| status | milestone_status | YES | 'upcoming' | Status |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** project_id, target_date

---

### task_comments

Comments on tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| task_id | UUID | NO | - | FK → tasks |
| user_id | UUID | YES | - | FK → profiles |
| content | TEXT | NO | - | Comment text |
| parent_id | UUID | YES | - | FK → task_comments (reply) |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** task_id, user_id

---

## 6. Knowledge Domain

Documentation and knowledge base.

### knowledge_pages

Wiki-style documentation pages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| parent_id | UUID | YES | - | FK → knowledge_pages |
| title | TEXT | YES | 'Untitled' | Page title |
| icon | TEXT | YES | - | Page icon |
| cover_image | TEXT | YES | - | Cover image URL |
| content | JSONB | YES | - | BlockNote JSON content |
| is_template | BOOLEAN | YES | false | Template flag |
| template_id | UUID | YES | - | FK → knowledge_pages |
| is_archived | BOOLEAN | YES | false | Archived flag |
| is_favorited_by | JSONB | YES | - | User IDs who favorited |
| position | INTEGER | YES | - | Sort position |
| created_by | UUID | YES | - | FK → profiles |
| last_edited_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, parent_id, created_by, is_template (partial), is_archived (partial), updated_at DESC, content (GIN)

---

### knowledge_whiteboards

Excalidraw-based whiteboards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| title | TEXT | YES | 'Untitled Whiteboard' | Title |
| icon | TEXT | YES | '🎨' | Icon |
| content | JSONB | YES | - | Excalidraw JSON |
| thumbnail | TEXT | YES | - | Preview image |
| is_archived | BOOLEAN | YES | false | Archived flag |
| is_favorited_by | JSONB | YES | - | User IDs |
| position | INTEGER | YES | - | Sort position |
| created_by | UUID | YES | - | FK → profiles |
| last_edited_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, created_by, is_archived (partial), updated_at DESC

---

### knowledge_templates

Reusable page templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | YES | - | FK → workspaces (null = system) |
| name | TEXT | NO | - | Template name |
| description | TEXT | YES | - | Description |
| icon | TEXT | YES | - | Icon |
| category | TEXT | YES | - | Category |
| content | JSONB | YES | - | BlockNote JSON |
| is_system | BOOLEAN | YES | false | System template |
| usage_count | INTEGER | YES | 0 | Times used |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**System Templates:** SOP Template, Meeting Notes, Onboarding Checklist, Process Documentation, Blank Page

---

## 7. Integrations Domain

External service integrations.

### plaid_items

Plaid bank connections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| user_id | UUID | NO | - | FK → profiles |
| plaid_item_id | TEXT | YES | - | Plaid item ID (unique) |
| plaid_access_token | TEXT | YES | - | Encrypted access token |
| plaid_institution_id | TEXT | YES | - | Institution ID |
| institution_name | TEXT | YES | - | Bank name |
| institution_logo | TEXT | YES | - | Logo URL |
| status | TEXT | YES | - | Connection status |
| error_code | TEXT | YES | - | Error code |
| error_message | TEXT | YES | - | Error message |
| last_successful_update | TIMESTAMPTZ | YES | - | Last sync |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, user_id, plaid_item_id (unique), status

---

### nylas_grants

Nylas email/calendar connections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| user_id | UUID | NO | - | FK → profiles |
| grant_id | TEXT | YES | - | Nylas grant ID (unique) |
| encrypted_access_token | TEXT | NO | - | Encrypted token |
| provider | TEXT | YES | - | google, microsoft |
| email | TEXT | NO | - | Connected email |
| scopes | TEXT[] | YES | - | Granted scopes |
| status | TEXT | YES | 'active' | active, error, expired |
| error_code | TEXT | YES | - | Error code |
| error_message | TEXT | YES | - | Error message |
| last_sync_at | TIMESTAMPTZ | YES | - | Last sync |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, user_id, grant_id (unique), email, status, provider

---

### twilio_numbers

Twilio phone numbers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| user_id | UUID | NO | - | FK → profiles |
| twilio_sid | TEXT | YES | - | Twilio SID (unique) |
| phone_number | TEXT | NO | - | E.164 phone number |
| friendly_name | TEXT | YES | - | Display name |
| capabilities | JSONB | YES | - | voice, sms, mms |
| is_primary | BOOLEAN | YES | false | Primary number |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Indexes:** workspace_id, user_id, phone_number
**Trigger:** Ensures only one primary number per user

---

### communications

Call and SMS records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| user_id | UUID | NO | - | FK → profiles |
| lead_id | UUID | YES | - | FK → leads |
| contact_id | UUID | YES | - | FK → contacts |
| type | TEXT | NO | - | sms, call |
| direction | TEXT | NO | - | inbound, outbound |
| twilio_sid | TEXT | YES | - | Twilio SID (unique) |
| twilio_status | TEXT | YES | - | Delivery status |
| from_number | TEXT | NO | - | From phone |
| to_number | TEXT | NO | - | To phone |
| body | TEXT | YES | - | SMS body |
| duration_seconds | INTEGER | YES | - | Call duration |
| recording_url | TEXT | YES | - | Recording URL |
| workflow_id | UUID | YES | - | FK → workflows |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, user_id, lead_id, contact_id, type, twilio_sid, created_at DESC

---

## 8. System Domain

Platform infrastructure and automation.

### workspace_api_keys

API keys for workspace integrations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | VARCHAR(255) | NO | - | Key name |
| key_prefix | VARCHAR(20) | NO | - | Visible prefix |
| key_hash | VARCHAR(255) | NO | - | Hashed key |
| created_by | UUID | NO | - | FK → profiles |
| last_used_at | TIMESTAMPTZ | YES | - | Last use |
| expires_at | TIMESTAMPTZ | YES | - | Expiration |
| is_revoked | BOOLEAN | YES | false | Revoked flag |
| revoked_at | TIMESTAMPTZ | YES | - | Revoke time |
| revoked_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, key_prefix, workspace_id+is_revoked (partial)

---

### agents

AI agents with custom system prompts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | VARCHAR(100) | NO | - | Agent name |
| description | TEXT | YES | - | Description |
| avatar_url | TEXT | YES | - | Avatar image |
| system_prompt | TEXT | NO | - | System instructions |
| tools | TEXT[] | YES | '{}' | Available tools |
| model | VARCHAR(100) | YES | 'gpt-4o-mini' | AI model |
| is_active | BOOLEAN | YES | true | Active status |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, created_by

---

### agent_skills

Reusable agent skills/capabilities.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| name | TEXT | NO | - | Skill identifier |
| display_name | TEXT | NO | - | Display name |
| description | TEXT | NO | - | Description |
| icon | TEXT | YES | - | Icon |
| content | TEXT | YES | - | Markdown instructions |
| is_active | BOOLEAN | YES | true | Active status |
| is_system | BOOLEAN | YES | false | System skill |
| created_by | UUID | YES | - | FK → profiles |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Unique:** (workspace_id, name)
**Indexes:** workspace_id, name, is_active (composite)

---

### workflows

Automation workflows.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| user_id | UUID | NO | - | FK → profiles |
| name | TEXT | NO | - | Workflow name |
| description | TEXT | YES | - | Description |
| trigger_type | TEXT | NO | - | Trigger type |
| trigger_config | JSONB | YES | - | Trigger configuration |
| is_active | BOOLEAN | YES | true | Active status |
| actions | JSONB | YES | - | Action definitions |
| created_at | TIMESTAMPTZ | YES | NOW() | - |
| updated_at | TIMESTAMPTZ | YES | NOW() | Auto-updated |

**Indexes:** workspace_id, user_id, trigger_type, is_active

---

### audit_logs

Immutable audit trail for compliance (SOC 2).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | YES | - | FK → workspaces |
| user_id | UUID | YES | - | FK → profiles |
| action | TEXT | NO | - | Action performed |
| resource_type | TEXT | NO | - | Resource type |
| resource_id | TEXT | YES | - | Resource ID |
| details | JSONB | YES | - | Additional details |
| ip_address | INET | YES | - | Client IP |
| user_agent | TEXT | YES | - | User agent |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Indexes:** workspace_id+created_at DESC, user_id+created_at DESC, action, resource_type+resource_id, created_at DESC
**Note:** Append-only table - no UPDATE or DELETE allowed

---

### workspace_files

Uploaded files storage.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| workspace_id | UUID | NO | - | FK → workspaces |
| uploaded_by | UUID | NO | - | FK → profiles |
| file_name | VARCHAR(255) | NO | - | File name |
| file_type | VARCHAR(100) | YES | - | MIME type |
| file_size | INTEGER | NO | - | Size in bytes |
| storage_path | TEXT | NO | - | Storage location |
| thumbnail_path | TEXT | YES | - | Thumbnail path |
| source_message_id | UUID | YES | - | FK → messages |
| source_channel_id | UUID | YES | - | FK → channels |
| created_at | TIMESTAMPTZ | YES | NOW() | - |

**Indexes:** workspace_id, uploaded_by, file_type, created_at DESC, source_channel_id

---

## Enums

```sql
-- Account types
CREATE TYPE account_type AS ENUM (
  'checking', 'savings', 'credit_card', 'cash',
  'investment', 'loan', 'other'
);

-- Category types
CREATE TYPE category_type AS ENUM ('expense', 'income');

-- Recurring frequency
CREATE TYPE recurring_frequency AS ENUM (
  'daily', 'weekly', 'biweekly', 'monthly',
  'quarterly', 'yearly'
);

-- Project status
CREATE TYPE project_status AS ENUM (
  'active', 'on_hold', 'completed', 'archived'
);

-- Project priority
CREATE TYPE project_priority AS ENUM (
  'low', 'medium', 'high', 'critical'
);

-- Task status
CREATE TYPE task_status AS ENUM (
  'todo', 'in_progress', 'review', 'done'
);

-- Task priority
CREATE TYPE task_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

-- Milestone status
CREATE TYPE milestone_status AS ENUM (
  'upcoming', 'at_risk', 'completed', 'missed'
);
```

---

## Design Patterns

### Multi-tenancy
All user data is isolated by `workspace_id`. Users access data only in workspaces they belong to.

### Row-Level Security (RLS)
Every user-facing table has RLS enabled with policies that check workspace membership via `workspace_members`.

### Soft Deletes
Tables use `is_archived` or `is_deleted` flags instead of hard deletes to preserve data integrity.

### Automatic Timestamps
All tables have `created_at` (auto-set) and most have `updated_at` (auto-updated via trigger).

### JSONB Flexibility
Complex/flexible content stored as JSONB:
- `knowledge_pages.content` - BlockNote editor format
- `knowledge_whiteboards.content` - Excalidraw format
- `workflows.actions` - Action definitions
- `audit_logs.details` - Event metadata

### Foreign Key Cascades
Most foreign keys use `ON DELETE CASCADE` to maintain referential integrity.

### Partial Indexes
Common filters optimized with partial indexes:
- `WHERE is_active = true`
- `WHERE is_archived = false`
- `WHERE is_system = true`

---

## RLS Policy Summary

| Table | Policy Pattern |
|-------|---------------|
| profiles | Own profile only |
| workspaces | Members only |
| workspace_members | Members can view co-members |
| channels | Public: all members; Private: channel members only |
| messages | Channel/DM participants only |
| All finance tables | Workspace members only |
| All CRM tables | Workspace members only |
| All project tables | Project members only |
| audit_logs | Insert only (append-only) |

---

## Triggers & Functions

### updated_at Triggers
Most tables have a `BEFORE UPDATE` trigger that sets `updated_at = NOW()`.

```sql
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Profile Creation
Auto-creates profile when user signs up via Supabase Auth.

```sql
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Account Balance Updates
Updates account balance when transactions are inserted/updated/deleted.

### Primary Twilio Number
Ensures only one primary Twilio number per user.

---

## Writing New Migrations

When adding new tables or columns:

1. **Check this document first** to avoid conflicts
2. **Use `IF NOT EXISTS`** for tables and indexes
3. **Use `ADD COLUMN IF NOT EXISTS`** wrapped in DO blocks for columns
4. **Create RLS policies** using the workspace membership pattern
5. **Add updated_at triggers** for mutable tables
6. **Name migrations sequentially** (e.g., `058_add_feature.sql`)

### Example Safe Migration

```sql
-- 058_add_admin_features.sql

-- Add column safely
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Create index safely
CREATE INDEX IF NOT EXISTS idx_profiles_superadmin
ON profiles(is_superadmin) WHERE is_superadmin = true;

-- New table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy (check is_superadmin)
CREATE POLICY "Superadmins can view audit logs"
ON admin_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_superadmin = true
  )
);
```
