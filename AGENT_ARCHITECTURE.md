# Agent Architecture

Comprehensive documentation of the DreamTeam AI agent system - roles, tools, collaboration patterns, and escalation flows.

---

## Overview Diagram

```
                            ┌──────────────────┐
                            │  FOUNDER/USER    │
                            │  (Human in Loop) │
                            └────────┬─────────┘
                                     │
                    Escalation ↑     │     ↓ Delegation
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              │         ┌────────────┴────────────┐         │
              │         │    CO-FOUNDER AGENT     │         │
              │         │      (PLANNED)          │         │
              │         │   Executive Strategy    │         │
              │         └────────────┬────────────┘         │
              │                      │                      │
    ┌─────────┴─────────┬────────────┼────────────┬─────────┴─────────┐
    │                   │            │            │                   │
    ▼                   ▼            ▼            ▼                   ▼
┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│ OPERATIONS│   │   SALES   │   │ MARKETING │   │  FINANCE  │   │  SYSTEMS  │
│   AGENT   │   │   AGENT   │   │   AGENT   │   │   AGENT   │   │   AGENT   │
│           │   │           │   │           │   │           │   │           │
│ Execution │   │   Sales   │   │ Marketing │   │  Finance  │   │  Systems  │
│ 37 tools  │   │ 38 tools  │   │ 32 tools  │   │ 35 tools  │   │ 22 tools  │
└─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
      │               │               │               │               │
      └───────────────┴───────────────┼───────────────┴───────────────┘
                                      │
                              ┌───────┴───────┐
                              │  PERFORMANCE  │
                              │    AGENT      │
                              │               │
                              │    People     │
                              │   28 tools    │
                              └───────────────┘
                                      │
                         Team Communication Hub
```

### Flow Legend
- **Escalation (↑)**: Issues requiring human/strategic decision flow upward
- **Delegation (↓)**: Work assignments flow downward to specialists
- **Lateral (↔)**: Peer collaboration for cross-functional work

---

## Agent Directory

### Summary Table

| Agent | Department | Tools | Model | Status | Core Ownership |
|-------|------------|-------|-------|--------|----------------|
| Operations Agent | Execution | 37 | Sonnet | Active | Projects & Tasks |
| Sales Agent | Sales | 38 | Sonnet | Active | CRM & Pipeline |
| Marketing Agent | Marketing | 32 | Sonnet | Active | Content & Campaigns |
| Finance Agent | Finance | 35 | Sonnet | Active | Money & Budgets |
| Systems Agent | Systems | 22 | Sonnet | Active | Automation & Platform |
| Performance Agent | People | 28 | Sonnet | Active | Team Communication |
| **Co-Founder Agent** | Executive | TBD | Opus | **Planned** | Strategy & Coordination |

**Total Active Tools**: 192 across 6 agents

---

## 1. Operations Agent

### Identity
- **Name**: Operations Agent
- **Slug**: `operations-agent`
- **Department**: Execution
- **Model**: Claude Sonnet

### Core Principle
> You OWN all projects and tasks. Period.

### Tools (37)

| Category | Count | Tools |
|----------|-------|-------|
| Projects | 11 | `project_list`, `project_get`, `project_create`, `project_update`, `project_delete`, `project_archive`, `project_add_member`, `project_remove_member`, `project_get_members`, `project_get_progress`, `project_get_activity` |
| Departments | 5 | `department_list`, `department_get`, `department_create`, `department_update`, `department_delete` |
| Tasks | 16 | `task_list`, `task_get`, `task_create`, `task_update`, `task_delete`, `task_assign`, `task_unassign`, `task_change_status`, `task_add_dependency`, `task_remove_dependency`, `task_add_label`, `task_remove_label`, `task_add_comment`, `task_get_comments`, `task_get_my_tasks`, `task_get_overdue` |
| Milestones | 8 | `milestone_list`, `milestone_get`, `milestone_create`, `milestone_update`, `milestone_delete`, `milestone_add_task`, `milestone_remove_task`, `milestone_get_progress` |

### Responsibilities
1. **Project Management** - Create and track all projects
2. **Task Coordination** - Break work into actionable tasks
3. **Timeline Management** - Set deadlines, monitor progress
4. **Blocker Resolution** - Identify what's stuck, escalate appropriately
5. **Execution Tracking** - Know what's done, doing, and blocked

### Cannot Do
- Send team messages (Performance Agent owns)
- Manage team members (Performance Agent owns)
- Create workflows (Systems Agent owns)
- Touch CRM/sales (Sales Agent owns)
- Handle money (Finance Agent owns)

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| → Request | Performance Agent | Team communication needed | "Send update to #product: 'New project created for Pricing Page Launch'" |
| → Request | Systems Agent | Automation needed | "Build workflow for task creation when deal closes" |
| ← Receives | Sales Agent | Deal closed | Creates customer onboarding project |
| ← Receives | All Agents | Work assignments | Creates tasks assigned to specific agents |

### Escalates To Founder
- Strategic decisions (should we do this project?)
- Resource constraints (need more people/budget)
- Projects at risk of missing critical deadlines

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Daily | Check `task_get_overdue`, flag tasks with no activity 3+ days |
| Weekly | Review project progress, identify bottlenecks, suggest task breakdowns |

---

## 2. Sales Agent

### Identity
- **Name**: Sales Agent
- **Slug**: `sales-agent`
- **Department**: Sales
- **Model**: Claude Sonnet

### Core Principle
> You OWN the entire CRM. Every lead, contact, company, deal, and sales activity.

### Tools (38)

| Category | Count | Tools |
|----------|-------|-------|
| Leads | 10 | `lead_list`, `lead_get`, `lead_create`, `lead_update`, `lead_qualify`, `lead_convert`, `lead_assign`, `lead_get_score`, `lead_bulk_import`, `lead_delete` |
| Contacts & Companies | 8 | `contact_list`, `contact_get`, `contact_create`, `contact_update`, `company_list`, `company_get`, `company_create`, `company_search` |
| Deals & Pipeline | 12 | `deal_list`, `deal_get`, `deal_create`, `deal_update`, `deal_move_stage`, `deal_win`, `deal_lose`, `deal_get_forecast`, `deal_get_by_stage`, `deal_get_closing_soon`, `pipeline_list`, `pipeline_get_metrics` |
| Activities | 8 | `activity_log`, `activity_list`, `activity_get_by_contact`, `activity_get_by_deal`, `activity_get_upcoming`, `activity_get_overdue`, `call_log`, `sms_send` |

### Responsibilities
1. **Lead Management** - Capture, qualify, nurture all leads
2. **Pipeline Management** - Track deals from first contact to close
3. **Outreach** - Cold/warm outreach via calls, email, SMS
4. **Deal Progression** - Move deals forward, remove friction, close
5. **Activity Logging** - Record every interaction immediately
6. **Revenue Forecasting** - Predict closings and revenue

### Cannot Do
- Create marketing campaigns/sequences (Marketing Agent owns)
- Create content (Marketing Agent owns)
- Send team updates (Performance Agent owns)
- Create tasks/projects (Operations Agent owns)
- Handle invoicing/payments (Finance Agent owns)

### Sales Process Flow
```
CAPTURE → QUALIFY → DISCOVER → PRESENT → PROPOSE → CLOSE → LOG
   ↓         ↓         ↓          ↓          ↓         ↓      ↓
lead_    lead_    activity_   activity_   deal_    deal_   activity_
create   qualify     log        log      create     win      log
```

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| ← Receives | Marketing Agent | Lead captured | Marketing passes form submissions |
| → Request | Marketing Agent | Need content | "Create case study about ABC Fencing's 15hr/week savings" |
| → Request | Operations Agent | Deal closed | "Create onboarding project for ABC Fencing, start Feb 1" |
| → Request | Finance Agent | Deal closed | "Create invoice for ABC Fencing, $12K annually" |
| → Request | Performance Agent | Team update | "Post in #sales: Closed Oldcastle deal at $45K ARR" |

### Escalates To Founder
- Pricing outside guidelines (>20% discount)
- Custom contract terms
- Strategic partnership discussions

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Monday AM | Check `deal_get_closing_soon`, review `activity_get_overdue`, check `pipeline_get_metrics` |
| Daily | Review `activity_get_upcoming`, log all interactions, update deal stages |
| Monthly | Clean stale leads, analyze win/loss reasons, share insights with Marketing |

---

## 3. Marketing Agent

### Identity
- **Name**: Marketing Agent
- **Slug**: `marketing-agent`
- **Department**: Marketing
- **Model**: Claude Sonnet

### Core Principle
> You OWN all customer-facing content, campaigns, and lead generation.

### Tools (32)

| Category | Count | Tools |
|----------|-------|-------|
| KB Pages | 7 | `kb_page_list`, `kb_page_get`, `kb_page_create`, `kb_page_update`, `kb_page_delete`, `kb_page_publish`, `kb_page_search` |
| KB Templates | 4 | `kb_template_list`, `kb_template_get`, `kb_template_create`, `kb_template_update` |
| KB Categories | 5 | `kb_category_list`, `kb_category_get`, `kb_category_create`, `kb_category_update`, `kb_category_get_pages` |
| Campaigns | 6 | `campaign_list`, `campaign_get`, `campaign_create`, `campaign_update`, `campaign_send`, `campaign_schedule` |
| Forms | 5 | `form_list`, `form_get`, `form_create`, `form_update`, `form_delete` |
| Sequences | 5 | `sequence_list`, `sequence_get`, `sequence_create`, `sequence_enroll`, `sequence_unenroll` |

### Responsibilities
1. **Content Creation** - Write all customer-facing content
2. **Campaign Management** - Email blasts, product launches, announcements
3. **Lead Capture** - Create forms, landing pages, CTAs
4. **Lead Nurturing** - Automated sequences that warm prospects
5. **Brand Voice** - Maintain consistent messaging
6. **Performance Tracking** - Monitor content/campaign effectiveness

### Cannot Do
- Create/manage leads in CRM (Sales Agent owns)
- Create/manage contacts (Sales Agent owns)
- Send internal team messages (Performance Agent owns)
- Create projects/tasks (Operations Agent owns)

### Content Types
| Type | Purpose |
|------|---------|
| Blog Posts | SEO-optimized thought leadership |
| Case Studies | Customer success stories with metrics |
| Email Campaigns | Product launches, announcements |
| Landing Pages | Conversion-optimized pages with forms |
| Lead Magnets | Downloadable guides, templates, calculators |
| Drip Sequences | Automated nurture flows |

### Funnel Ownership
```
Marketing Owns (Top/Middle)          Sales Owns (Bottom)
┌─────────────────────────┐         ┌─────────────────────────┐
│ AWARENESS: Blog, SEO    │         │ CONVERSION: Demos,      │
│ INTEREST: Lead magnets  │   →→→   │   proposals, closing    │
│ CONSIDERATION: Cases    │ HANDOFF │ RETENTION: Renewals     │
└─────────────────────────┘         └─────────────────────────┘
```

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| → Notify | Sales Agent | Form submitted | "New lead from pricing calculator: John Smith at ABC Fencing" |
| ← Receives | Sales Agent | Content request | "Create case study about ABC Fencing" |
| ← Receives | Sales Agent | Objection patterns | "Prospects say it's expensive - create ROI content" |
| → Request | Performance Agent | Team update | "Announce in #general: Published new pricing page" |
| → Request | Operations Agent | Production work | "Create task to design infographic, due Jan 25" |

### Escalates To Founder
- Major messaging/positioning changes
- Large campaign budget requests

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Weekly | Review conversion-driving content, campaign performance, suggest content based on Sales objections |
| Monthly | Audit content library for gaps, optimize low-performing sequences, test new campaign ideas |

---

## 4. Finance Agent

### Identity
- **Name**: Finance Agent
- **Slug**: `finance-agent`
- **Department**: Finance
- **Model**: Claude Sonnet

### Core Principle
> You OWN all money. Every dollar tracked, categorized, and accounted for.

### Tools (35)

| Category | Count | Tools |
|----------|-------|-------|
| Accounts | 8 | `account_list`, `account_get`, `account_create`, `account_update`, `account_delete`, `account_get_balance`, `account_list_by_type`, `account_get_totals` |
| Transactions | 10 | `transaction_list`, `transaction_get`, `transaction_create`, `transaction_update`, `transaction_delete`, `transaction_create_transfer`, `transaction_bulk_categorize`, `transaction_search`, `transaction_get_by_date_range`, `transaction_get_uncategorized` |
| Categories | 5 | `category_list`, `category_get`, `category_create`, `category_get_spending`, `category_get_budget_usage` |
| Budgets | 6 | `budget_list`, `budget_get`, `budget_create`, `budget_update`, `budget_get_summary`, `budget_get_variance` |
| Bills & Vendors | 6 | `bill_list`, `bill_get`, `bill_create`, `bill_mark_paid`, `vendor_list`, `vendor_create` |

### Responsibilities
1. **Bookkeeping** - Record and categorize every transaction
2. **Account Management** - Track all accounts and balances
3. **Bill Payment** - Ensure bills paid on time
4. **Budgeting** - Set budgets, monitor variance
5. **Cash Flow** - Track runway and burn rate
6. **Financial Reporting** - Monthly close, P&L, cash flow statements

### Cannot Do
- Create invoices for customers (Sales Agent coordinates)
- Create projects/tasks (Operations Agent owns)
- Send team updates (Performance Agent owns)
- Make strategic spending decisions (Founder decides)

### Financial Priorities (Ranked)
1. **RUNWAY** - Months of cash at current burn
2. **BURN RATE** - Monthly spending (3-month average)
3. **REVENUE** - Monthly recurring + one-time
4. **EXPENSES** - By category, trends
5. **PROFITABILITY** - Revenue minus Expenses

### Standard Categories
| Category | Examples |
|----------|----------|
| Software/SaaS | Vercel, Supabase, Claude API |
| Marketing | Ads, SEM tools, content services |
| Office | Slack, Notion, productivity tools |
| Professional Services | Legal, accounting, consultants |
| Payroll | Salaries, contractor payments |
| Travel & Meals | Business trips, client dinners |

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| ← Receives | Sales Agent | Deal closed | "Create invoice for ABC Fencing, $12K annually" |
| → Alert | Founder | Financial threshold | "Runway down to 5.8 months - below 6-month threshold" |
| → Request | Performance Agent | Team update | "Post in #general: Monthly close complete, P&L attached" |
| → Request | Operations Agent | Bill tracking | "Create task to renew domain, due Jan 25, $50" |

### Escalates To Founder
- Runway drops below 6 months
- Unexpected large expense (>$1K)
- Budget overrun >10% in any category
- Revenue miss vs forecast

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Daily | Categorize `transaction_get_uncategorized`, review upcoming `bill_list`, flag unusual charges |
| Weekly | Calculate burn rate/runway, check `budget_get_variance`, reconcile accounts |
| Monthly | Monthly close, P&L generation, subscription review, budget updates, Founder report |

---

## 5. Systems Agent

### Identity
- **Name**: Systems Agent
- **Slug**: `systems-agent`
- **Department**: Systems
- **Model**: Claude Sonnet

### Core Principle
> You OWN all automation, workflows, and the agent platform itself.

### Tools (22)

| Category | Count | Tools |
|----------|-------|-------|
| Agent Management | 10 | `agent_list`, `agent_get`, `agent_create`, `agent_update`, `agent_enable`, `agent_disable`, `agent_add_skill`, `agent_remove_skill`, `agent_get_skills`, `agent_get_stats` |
| Workflows | 9 | `workflow_list`, `workflow_get`, `workflow_create`, `workflow_update`, `workflow_delete`, `workflow_execute`, `workflow_get_executions`, `workflow_enable`, `workflow_disable` |
| Skills | 3 | `skill_list`, `skill_get`, `skill_create` |

### Responsibilities
1. **Workflow Automation** - Build workflows that automate repetitive processes
2. **Agent Deployment** - Configure and deploy new agents
3. **Platform Management** - Keep the system running smoothly
4. **Performance Optimization** - Monitor and improve automation efficiency
5. **Agent Coordination** - Help agents work together via workflows

### Cannot Do
- Execute business operations (other agents do the work)
- Make strategic decisions (Founder decides)
- Communicate with team (Performance Agent owns)

### Workflow Building Process
```
1. TRIGGER     →  What starts this? (time, event, manual)
2. MAP STEPS   →  What happens in order? Who does what?
3. TOOLS       →  Which agent uses which tools?
4. LOGIC       →  IF/THEN conditions, error handling
5. TEST        →  Use workflow_execute to verify
6. MONITOR     →  Track via workflow_get_executions
```

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| ← Receives | Operations Agent | Automation request | "Automate onboarding: when deal won, create project + welcome email" |
| ← Receives | Sales Agent | Workflow request | "Build lead follow-up: when score >70, send email + schedule call" |
| ← Receives | Finance Agent | Automation request | "Automate monthly close: on 1st, reconcile + report to Founder" |
| → Request | Performance Agent | Announcement | "Announce in #general: Deployed new lead follow-up automation" |

### Escalates To Founder
- Major platform changes
- Agent deployment strategy questions
- Workflow priority decisions

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Weekly | Review `workflow_get_executions` for failures, check `agent_get_stats`, identify patterns to automate |
| Monthly | Audit active workflows, clean up failed/stale workflows, update agent configs, document automations |

---

## 6. Performance Agent

### Identity
- **Name**: Performance Agent
- **Slug**: `performance-agent`
- **Department**: People
- **Model**: Claude Sonnet

### Core Principle
> You OWN all internal team communication and people operations.

### Tools (28)

| Category | Count | Tools |
|----------|-------|-------|
| Workspace & Members | 7 | `workspace_get`, `workspace_update`, `member_list`, `member_get`, `member_invite`, `member_update`, `member_get_activity` |
| Channels | 8 | `channel_list`, `channel_get`, `channel_create`, `channel_update`, `channel_delete`, `channel_add_member`, `channel_remove_member`, `channel_get_messages` |
| Messages | 8 | `message_send`, `message_list`, `message_get`, `message_update`, `message_pin`, `message_search`, `dm_create`, `dm_send` |
| Internal Docs | 5 | `kb_page_list`, `kb_page_get`, `kb_page_create`, `kb_template_list`, `kb_template_get` |

### Responsibilities
1. **Internal Communications** - Team updates, announcements, coordination
2. **Channel Management** - Organize communication by topic/department
3. **Team Coordination** - Facilitate meetings, decisions, discussions
4. **Onboarding** - Welcome new team members, get them up to speed
5. **Internal Documentation** - Team wiki, processes, how-we-work guides
6. **Culture** - Recognize wins, facilitate feedback, maintain morale

### Cannot Do
- Create marketing content (Marketing Agent owns)
- Create projects/tasks (Operations Agent owns)
- Manage CRM (Sales Agent owns)
- Make strategic decisions (Founder decides)

### Content Ownership Split
| Performance Agent (Internal) | Marketing Agent (External) |
|------------------------------|---------------------------|
| Team handbook | Blog posts |
| Onboarding docs | Case studies |
| Process guides | Landing pages |
| Wiki pages | Marketing emails |
| Meeting notes | Customer content |

### Default Channel Structure
| Channel | Purpose |
|---------|---------|
| #general | Company-wide announcements |
| #random | Team bonding, culture |
| #product | Product development discussions |
| #sales | Sales team coordination |
| #marketing | Marketing campaigns |
| #finance | Financial updates |
| #engineering | Technical discussions |

### Onboarding Protocol
```
1. Send welcome DM          → dm_send
2. Add to channels          → channel_add_member
3. Share onboarding doc     → kb_page_create (if needed)
4. Schedule intro meetings  → (coordinate with Operations)
5. Daily check-ins (week 1) → dm_send
```

### Collaboration Patterns

| Direction | Agent | Trigger | Example |
|-----------|-------|---------|---------|
| ← Receives | All Agents | Communication request | "Announce in #general that we hit Q1 goal" |
| ← Receives | All Agents | DM request | "DM Sarah to check in on her first week" |
| → Coordinate | Operations Agent | Status updates | Gets project status for team updates |
| → Coordinate | Founder | Strategy | Gets approval for strategic announcements |

### Escalates To Founder
- Strategic announcements (get approval first)
- Team performance issues
- Culture concerns

### Proactive Behaviors

| Frequency | Action |
|-----------|--------|
| Daily | Check unanswered questions, monitor `member_get_activity`, respond to agent requests |
| Weekly | Send team update, organize messy conversations, recognize wins publicly |
| Monthly | Update internal docs, archive inactive channels, check team engagement |

---

## 7. Co-Founder Agent (PLANNED)

### Identity
- **Name**: Co-Founder Agent
- **Slug**: `cofounder-agent`
- **Department**: Executive
- **Model**: Claude Opus (planned)
- **Status**: **Not Yet Implemented**

### Planned Role
Strategic coordinator between Founder and department agents. Handles:
- Cross-functional coordination
- Strategic planning assistance
- Decision support with analysis
- Agent orchestration for complex multi-department initiatives

### Anticipated Tools
TBD - Likely a combination of:
- Read access to all agent tools (monitoring)
- Strategic planning tools
- Cross-agent coordination tools
- Reporting aggregation tools

---

## Collaboration Matrix

### Who Delegates to Whom

```
                    RECEIVES WORK FROM
                    Ops  Sales  Mktg  Fin  Sys  Perf
DELEGATES     Ops    -     ✓     -    -    -    -
TO            Sales  -     -     ✓    -    -    -
              Mktg   ✓     ✓     -    -    -    -
              Fin    ✓     ✓     -    -    -    -
              Sys    ✓     ✓     ✓    ✓   -    -
              Perf   ✓     ✓     ✓    ✓   ✓    -
```

### Common Handoff Triggers

| From | To | Trigger | Context Passed |
|------|-----|---------|----------------|
| Sales | Operations | Deal won | Customer name, start date, requirements |
| Sales | Finance | Deal won | Customer, amount, payment terms |
| Sales | Marketing | Content needed | Objection patterns, customer story details |
| Marketing | Sales | Lead captured | Lead name, source, form data |
| Operations | Performance | Update needed | Project/milestone status |
| Finance | Founder | Threshold breach | Runway, budget variance details |
| All | Systems | Automation needed | Process description, trigger conditions |
| All | Performance | Announcement needed | Channel, message content |

---

## Escalation Flows

### What Goes to Founder

| Agent | Escalation Trigger | Urgency |
|-------|-------------------|---------|
| Operations | Strategic decisions, resource constraints, critical deadline risk | High |
| Sales | Pricing >20% discount, custom contracts, strategic partnerships | Medium-High |
| Marketing | Major positioning changes, large budget requests | Medium |
| Finance | Runway <6 months, expense >$1K, budget overrun >10% | High |
| Systems | Major platform changes, deployment strategy | Medium |
| Performance | Strategic announcements, performance issues, culture concerns | Medium |

### Decision Authority Levels

| Level | Authority | Examples |
|-------|-----------|----------|
| **Agent Autonomous** | Execute within domain | Create task, log activity, send message |
| **Agent Collaborative** | Coordinate with peers | Request content, trigger workflow |
| **Founder Approval** | Strategic/financial impact | Pricing changes, major spending, strategic decisions |

### Escalation Format
When escalating, agents should provide:
1. **Context**: What happened / what's needed
2. **Impact**: Why this matters
3. **Options**: Possible paths forward (if applicable)
4. **Recommendation**: Agent's suggested approach

---

## Technical Details

### Model Configuration
All agents currently use **Claude Sonnet** (`claude-sonnet-4-5-20250929`) with:
- Max turns: 10
- Permission mode: Default
- Version: 1

### Tool Overlap Analysis

Some tools are shared across agents for read access:

| Tool | Agents |
|------|--------|
| `kb_page_*` (read) | Marketing, Performance |
| `kb_template_*` (read) | Marketing, Performance |

All other tools are exclusive to their designated agent.

---

## Appendix: Complete Tool Reference

### Operations Agent (37 tools)
```
project_list, project_get, project_create, project_update, project_delete,
project_archive, project_add_member, project_remove_member, project_get_members,
project_get_progress, project_get_activity, department_list, department_get,
department_create, department_update, department_delete, task_list, task_get,
task_create, task_update, task_delete, task_assign, task_unassign,
task_change_status, task_add_dependency, task_remove_dependency, task_add_label,
task_remove_label, task_add_comment, task_get_comments, task_get_my_tasks,
task_get_overdue, milestone_list, milestone_get, milestone_create,
milestone_update, milestone_delete, milestone_add_task, milestone_remove_task,
milestone_get_progress
```

### Sales Agent (38 tools)
```
lead_list, lead_get, lead_create, lead_update, lead_qualify, lead_convert,
lead_assign, lead_get_score, lead_bulk_import, lead_delete, contact_list,
contact_get, contact_create, contact_update, company_list, company_get,
company_create, company_search, deal_list, deal_get, deal_create, deal_update,
deal_move_stage, deal_win, deal_lose, deal_get_forecast, deal_get_by_stage,
deal_get_closing_soon, pipeline_list, pipeline_get_metrics, activity_log,
activity_list, activity_get_by_contact, activity_get_by_deal,
activity_get_upcoming, activity_get_overdue, call_log, sms_send
```

### Marketing Agent (32 tools)
```
kb_page_list, kb_page_get, kb_page_create, kb_page_update, kb_page_delete,
kb_page_publish, kb_page_search, kb_template_list, kb_template_get,
kb_template_create, kb_template_update, kb_category_list, kb_category_get,
kb_category_create, kb_category_update, kb_category_get_pages, campaign_list,
campaign_get, campaign_create, campaign_update, campaign_send, campaign_schedule,
form_list, form_get, form_create, form_update, form_delete, sequence_list,
sequence_get, sequence_create, sequence_enroll, sequence_unenroll
```

### Finance Agent (35 tools)
```
account_list, account_get, account_create, account_update, account_delete,
account_get_balance, account_list_by_type, account_get_totals, transaction_list,
transaction_get, transaction_create, transaction_update, transaction_delete,
transaction_create_transfer, transaction_bulk_categorize, transaction_search,
transaction_get_by_date_range, transaction_get_uncategorized, category_list,
category_get, category_create, category_get_spending, category_get_budget_usage,
budget_list, budget_get, budget_create, budget_update, budget_get_summary,
budget_get_variance, bill_list, bill_get, bill_create, bill_mark_paid,
vendor_list, vendor_create
```

### Systems Agent (22 tools)
```
agent_list, agent_get, agent_create, agent_update, agent_enable, agent_disable,
agent_add_skill, agent_remove_skill, agent_get_skills, agent_get_stats,
workflow_list, workflow_get, workflow_create, workflow_update, workflow_delete,
workflow_execute, workflow_get_executions, workflow_enable, workflow_disable,
skill_list, skill_get, skill_create
```

### Performance Agent (28 tools)
```
workspace_get, workspace_update, member_list, member_get, member_invite,
member_update, member_get_activity, channel_list, channel_get, channel_create,
channel_update, channel_delete, channel_add_member, channel_remove_member,
channel_get_messages, message_send, message_list, message_get, message_update,
message_pin, message_search, dm_create, dm_send, kb_page_list, kb_page_get,
kb_page_create, kb_template_list, kb_template_get
```
