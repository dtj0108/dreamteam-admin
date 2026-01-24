-- Add data efficiency rule to agents with project/task tools
-- This instructs agents to use filters and pagination to reduce token costs

INSERT INTO agent_rules (agent_id, rule_type, rule_content, priority, is_enabled)
SELECT
  a.id,
  'always',
  'Use pagination and filters when querying data:
- Always use limit parameter (default: 20 items max)
- Use status filters to exclude archived/completed items
- Use date filters (updated_at, due_date) to get recent data only
- Only fetch full details when specifically needed
- For summaries: request minimal fields, filter by status=active',
  100,
  true
FROM ai_agents a
WHERE EXISTS (
  SELECT 1 FROM ai_agent_tools aat
  JOIN agent_tools at ON aat.tool_id = at.id
  WHERE aat.agent_id = a.id
  AND at.name IN ('project_list', 'task_list', 'task_get_overdue')
)
-- Avoid duplicates if rule already exists
AND NOT EXISTS (
  SELECT 1 FROM agent_rules ar
  WHERE ar.agent_id = a.id
  AND ar.rule_content LIKE '%pagination and filters%'
);
