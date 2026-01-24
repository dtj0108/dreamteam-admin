let scheduleCounter = 0
let executionCounter = 0

export interface ScheduledTask {
  id: string
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  is_enabled: boolean
  requires_approval: boolean
  prompt_template: string
  next_run_at: string | null
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface ScheduledTaskExecution {
  id: string
  scheduled_task_id: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed'
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  input_prompt: string
  output_response: string | null
  error_message: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
}

export function createScheduledTask(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  scheduleCounter++

  return {
    id: overrides.id ?? `schedule-${scheduleCounter}`,
    agent_id: overrides.agent_id ?? `agent-1`,
    name: overrides.name ?? `Test Schedule ${scheduleCounter}`,
    description: overrides.description ?? `Description for test schedule ${scheduleCounter}`,
    cron_expression: overrides.cron_expression ?? '0 9 * * *', // Daily at 9 AM
    timezone: overrides.timezone ?? 'UTC',
    is_enabled: overrides.is_enabled ?? true,
    requires_approval: overrides.requires_approval ?? false,
    prompt_template: overrides.prompt_template ?? 'Run the daily task',
    next_run_at: overrides.next_run_at ?? new Date(Date.now() + 3600000).toISOString(),
    last_run_at: overrides.last_run_at ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  }
}

export function createScheduledTaskExecution(
  overrides: Partial<ScheduledTaskExecution> = {}
): ScheduledTaskExecution {
  executionCounter++

  return {
    id: overrides.id ?? `execution-${executionCounter}`,
    scheduled_task_id: overrides.scheduled_task_id ?? `schedule-1`,
    status: overrides.status ?? 'pending_approval',
    scheduled_for: overrides.scheduled_for ?? new Date().toISOString(),
    started_at: overrides.started_at ?? null,
    completed_at: overrides.completed_at ?? null,
    input_prompt: overrides.input_prompt ?? 'Run the task',
    output_response: overrides.output_response ?? null,
    error_message: overrides.error_message ?? null,
    approved_by: overrides.approved_by ?? null,
    approved_at: overrides.approved_at ?? null,
    rejection_reason: overrides.rejection_reason ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    ...overrides,
  }
}

export function createScheduledTaskList(count: number, overrides: Partial<ScheduledTask> = {}): ScheduledTask[] {
  return Array.from({ length: count }, () => createScheduledTask(overrides))
}

export function createExecutionList(
  count: number,
  overrides: Partial<ScheduledTaskExecution> = {}
): ScheduledTaskExecution[] {
  return Array.from({ length: count }, () => createScheduledTaskExecution(overrides))
}

export function resetScheduleCounter() {
  scheduleCounter = 0
}

export function resetExecutionCounter() {
  executionCounter = 0
}
