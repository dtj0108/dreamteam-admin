-- Populate user_description for core agents based on their purpose and tools

-- Operations Agent: Project & task management (37 tools)
UPDATE public.ai_agents
SET user_description = 'Your execution expert. I manage all projects, tasks, and timelines. Need something done? I create it, track it, and drive it to completion. I own milestones, deadlines, and making sure nothing falls through the cracks.',
    updated_at = now()
WHERE name = 'Operations Agent'
  AND user_description IS NULL;

-- Sales Agent: CRM & pipeline (38 tools)
UPDATE public.ai_agents
SET user_description = 'Your revenue engine. I own the entire CRM - every lead, contact, company, and deal. I track your pipeline, log all sales activities, and help you close more deals faster.',
    updated_at = now()
WHERE name = 'Sales Agent'
  AND user_description IS NULL;

-- Marketing Agent: Content & campaigns (32 tools)
UPDATE public.ai_agents
SET user_description = 'Your growth driver. I create all customer-facing content, run email campaigns, build lead capture forms, and nurture prospects with automated sequences. I fill the funnel so Sales can close.',
    updated_at = now()
WHERE name = 'Marketing Agent'
  AND user_description IS NULL;

-- Finance Agent: Money tracking (35 tools)
UPDATE public.ai_agents
SET user_description = 'Your financial backbone. I track every dollar - accounts, transactions, budgets, and bills. I categorize spending, monitor cash flow, and keep your books clean for clear business decisions.',
    updated_at = now()
WHERE name = 'Finance Agent'
  AND user_description IS NULL;

-- Systems Agent: Automation & workflows (22 tools)
UPDATE public.ai_agents
SET user_description = 'Your automation architect. I build the machine that runs your business. Workflows, agent coordination, and platform management - I automate repetitive tasks so your team can focus on high-value work.',
    updated_at = now()
WHERE name = 'Systems Agent'
  AND user_description IS NULL;

-- Performance Agent: Team & internal comms (28 tools)
UPDATE public.ai_agents
SET user_description = 'Your people partner. I own all internal team communication - channels, messages, and DMs. I create internal documentation, coordinate team activities, and keep everyone aligned and informed.',
    updated_at = now()
WHERE name = 'Performance Agent'
  AND user_description IS NULL;

-- Fallback for any agents still missing user_description
UPDATE public.ai_agents
SET user_description = 'Your AI assistant for ' || LOWER(REPLACE(name, ' Agent', '')) || '-related tasks and operations.',
    updated_at = now()
WHERE user_description IS NULL
  AND name IS NOT NULL;
