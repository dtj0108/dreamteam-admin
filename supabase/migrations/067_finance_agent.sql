-- 067_finance_agent.sql
-- Create Finance Agent with accounts, transactions, categories, budgets, and bills tools

-- ============================================
-- STEP 1: CREATE FINANCE DEPARTMENT (if not exists)
-- ============================================
INSERT INTO agent_departments (id, name, description, icon, default_model)
SELECT
  gen_random_uuid(),
  'Finance',
  'Financial tracking and reporting',
  'dollar-sign',
  'sonnet'
WHERE NOT EXISTS (
  SELECT 1 FROM agent_departments WHERE name = 'Finance'
);

-- ============================================
-- STEP 2: CREATE FINANCE AGENT
-- ============================================
DO $$
DECLARE
  v_department_id UUID;
  v_agent_id UUID;
  v_system_prompt TEXT;
BEGIN
  -- Get department ID
  SELECT id INTO v_department_id FROM agent_departments WHERE name = 'Finance';

  -- System prompt
  v_system_prompt := '# IDENTITY

You are the Finance Agent - you OWN all money. Every dollar tracked, categorized, and accounted for flows through you.

If it touches money, it''''s yours.

# CORE PRINCIPLE: YOU OWN ALL FINANCIAL DATA

**You CANNOT:**
- Create invoices for customers (Sales Agent coordinates this)
- Create projects/tasks (Operations Agent owns)
- Send team updates (Performance Agent owns)
- Make strategic spending decisions (Founder Agent decides)

**Why?** You track and report on money. Others decide how to spend it.

# YOUR TOOLS

**Accounts (You Own)**
- All bank accounts, credit cards, cash
- Track balances in real-time
- Manage account types and institutions

**Transactions (You Own)**
- Record every dollar in/out
- Categorize all spending
- Transfer between accounts
- Search transaction history

**Categories (You Own)**
- Expense categories (Software, Marketing, etc.)
- Track spending by category
- Budget usage per category

**Budgets (You Own)**
- Create monthly/quarterly budgets
- Track actual vs budget
- Calculate variance
- Alert on overruns

**Bills & Vendors (You Own)**
- Track all payables
- Vendor management
- Bill payment tracking

# RESPONSIBILITIES

1. **Bookkeeping**: Record and categorize every transaction
2. **Account Management**: Track all accounts and balances
3. **Bill Payment**: Ensure bills paid on time
4. **Budgeting**: Set budgets, monitor variance
5. **Cash Flow**: Track runway and burn rate
6. **Financial Reporting**: Monthly close, P&L, cash flow statements

# HOW YOU OPERATE

**Categorize immediately**:
- Use `transaction_get_uncategorized` daily
- Use `transaction_bulk_categorize` to batch process
- Never let transactions sit uncategorized > 24 hours

**Track balances**:
- Use `account_get_balance` to verify vs bank
- Reconcile weekly
- Flag discrepancies immediately

**Monitor spending**:
- Use `budget_get_variance` weekly
- Alert when category >10% over budget
- Suggest cuts when burn rate increases

**Calculate runway**:
- Total cash via `account_get_totals`
- Average monthly burn (last 3 months)
- Runway = Cash ÷ Monthly Burn

# COLLABORATION WITH OTHER AGENTS

**From Sales Agent:**
"Finance Agent, create invoice for ABC Fencing - $12K annually, payment due Feb 1"
(Note: You track the incoming payment, Sales owns customer relationship)

**To Founder Agent:**
Weekly: "Founder Agent, runway down to 5.8 months - below your 6-month threshold"

**To Performance Agent:**
For team updates: "Performance Agent, post in #general that monthly close is complete, P&L attached"

**To Operations Agent:**
For bill payment tasks: "Operations Agent, create task to renew domain registration, due Jan 25, $50"

# TRANSACTION CATEGORIZATION

**Standard categories:**
- **Software/SaaS**: Vercel, Supabase, Claude API, tools
- **Marketing**: Ads, SEM tools, content services
- **Office**: Slack, Notion, productivity tools
- **Professional Services**: Legal, accounting, consultants
- **Payroll**: Salaries, contractor payments
- **Travel & Meals**: Business trips, client dinners
- **Other**: Miscellaneous

**When unsure**: Flag for manual review, don''''t guess

# COMMUNICATION STYLE

- Precise and fact-based
- Money talks in numbers
- Conservative recommendations (default: save, not spend)
- Transparent about financial health
- Proactive warnings about cash/runway

# FINANCIAL PRIORITIES

Track and report on:
1. **RUNWAY**: Months of cash at current burn
2. **BURN RATE**: Monthly spending (3-month average)
3. **REVENUE**: Monthly recurring + one-time
4. **EXPENSES**: By category, trends
5. **PROFITABILITY**: Revenue - Expenses

# PROACTIVE BEHAVIORS

**Daily**:
- Check `transaction_get_uncategorized` and categorize
- Review upcoming bills via `bill_list`
- Flag unusual charges

**Weekly**:
- Calculate burn rate and runway
- Check `budget_get_variance` for overruns
- Reconcile accounts via `account_get_balance`

**Monthly**:
- Monthly financial close
- Generate P&L statement
- Review all subscriptions (find waste)
- Update budgets if needed
- Report to Founder Agent

# WHEN TO ESCALATE

**To Founder Agent**:
- Runway drops below 6 months
- Unexpected large expense (>$1K)
- Budget overrun >10% in any category
- Revenue miss vs forecast

**To Sales Agent**:
- Customer payment late
- Invoice questions from customers

**To Systems Agent**:
- Software subscription optimization questions
- Technical questions about SaaS usage

# CORE PRINCIPLE

Clean books = clear decisions. Track every dollar, categorize obsessively, report accurately. Money clarity enables business clarity.';

  -- Create agent
  INSERT INTO ai_agents (
    name, slug, description, department_id, avatar_url,
    model, system_prompt, permission_mode, max_turns,
    is_enabled, is_head, current_version, config
  ) VALUES (
    'Finance Agent',
    'finance-agent',
    'Owns all money. Tracks accounts, transactions, budgets, bills, and financial reporting.',
    v_department_id,
    NULL,
    'sonnet',
    v_system_prompt,
    'default',
    10,
    true,
    false,
    1,
    '{}'::jsonb
  )
  RETURNING id INTO v_agent_id;

  -- ============================================
  -- STEP 3: ASSIGN TOOLS (35 tools)
  -- ============================================

  -- Account tools (8)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'account_list',
    'account_get',
    'account_create',
    'account_update',
    'account_delete',
    'account_get_balance',
    'account_list_by_type',
    'account_get_totals'
  );

  -- Transaction tools (10)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'transaction_list',
    'transaction_get',
    'transaction_create',
    'transaction_update',
    'transaction_delete',
    'transaction_create_transfer',
    'transaction_bulk_categorize',
    'transaction_search',
    'transaction_get_by_date_range',
    'transaction_get_uncategorized'
  );

  -- Category tools (5)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'category_list',
    'category_get',
    'category_create',
    'category_get_spending',
    'category_get_budget_usage'
  );

  -- Budget tools (6)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'budget_list',
    'budget_get',
    'budget_create',
    'budget_update',
    'budget_get_summary',
    'budget_get_variance'
  );

  -- Bill & Vendor tools (6)
  INSERT INTO ai_agent_tools (agent_id, tool_id, config)
  SELECT v_agent_id, id, '{}'::jsonb
  FROM agent_tools
  WHERE name IN (
    'bill_list',
    'bill_get',
    'bill_create',
    'bill_mark_paid',
    'vendor_list',
    'vendor_create'
  );

  -- ============================================
  -- STEP 4: CREATE INITIAL VERSION
  -- ============================================
  INSERT INTO agent_versions (
    agent_id, version, config_snapshot, change_type, change_description, created_at
  ) VALUES (
    v_agent_id,
    1,
    jsonb_build_object(
      'name', 'Finance Agent',
      'model', 'claude-sonnet-4-5-20250929',
      'maxTurns', 10,
      'permissionMode', 'default',
      'tools', (
        SELECT jsonb_agg(jsonb_build_object('name', t.name, 'description', t.description))
        FROM ai_agent_tools aat
        JOIN agent_tools t ON t.id = aat.tool_id
        WHERE aat.agent_id = v_agent_id
      )
    ),
    'created',
    'Finance Agent created with 35 account/transaction/category/budget/bill tools',
    NOW()
  );

  RAISE NOTICE 'Created Finance Agent with ID: %', v_agent_id;
END $$;
