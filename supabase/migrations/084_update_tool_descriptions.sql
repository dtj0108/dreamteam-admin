-- Update tool descriptions to emphasize filters and reduce token usage
-- These descriptions guide agents to use parameters that minimize response sizes

-- Update project_list description
UPDATE agent_tools
SET description = 'List projects in a workspace. IMPORTANT: Always use filters to reduce response size. Parameters: status (active/archived), limit (default 20), offset for pagination. Never load all projects - filter by status=active for summaries.'
WHERE name = 'project_list';

-- Update task_list description
UPDATE agent_tools
SET description = 'List tasks with filters. IMPORTANT: Always filter to reduce tokens. Use: status (todo/in_progress/review/done), priority, limit (default 20), project_id for specific projects. For overdue tasks, use task_get_overdue instead.'
WHERE name = 'task_list';

-- Update task_get_overdue description
UPDATE agent_tools
SET description = 'Get overdue tasks only - more efficient than filtering task_list. Returns tasks past due_date that are not done. Use this for weekly reviews instead of loading all tasks.'
WHERE name = 'task_get_overdue';
