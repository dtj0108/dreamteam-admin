// Agent Builder Types

// ============================================
// CORE AGENT TYPES
// ============================================

export type AgentModel = 'sonnet' | 'opus' | 'haiku'
export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions'

export interface Agent {
  id: string
  name: string
  slug: string | null
  description: string | null
  department_id: string | null
  avatar_url: string | null
  model: AgentModel
  system_prompt: string
  permission_mode: PermissionMode
  max_turns: number
  is_enabled: boolean
  is_head: boolean
  config: Record<string, unknown>
  current_version: number
  published_version: number | null
  created_at: string
  updated_at: string
}

export interface AgentWithRelations extends Agent {
  department?: AgentDepartment | null
  tools?: AgentToolAssignment[]
  skills?: AgentSkillAssignment[]
  delegations?: AgentDelegation[]
  rules?: AgentRule[]
  prompt_sections?: AgentPromptSection[]
}

export interface AgentDepartment {
  id: string
  name: string
  description: string | null
  icon: string
  default_model: AgentModel
  head_agent_id: string | null
  created_at: string
  updated_at: string
}

// ============================================
// TOOL TYPES
// ============================================

export type ToolCategory = 'finance' | 'crm' | 'team' | 'projects' | 'knowledge' | 'communications' | 'goals' | 'agents'

export interface AgentTool {
  id: string
  name: string
  description: string | null
  category: ToolCategory
  input_schema: Record<string, unknown>
  is_builtin: boolean
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AgentToolAssignment {
  agent_id: string
  tool_id: string
  config: Record<string, unknown>
  tool?: AgentTool
}

// ============================================
// SKILL TYPES (imported from skills.ts for assignment)
// ============================================

export interface AgentSkillAssignment {
  agent_id: string
  skill_id: string
  skill?: {
    id: string
    name: string
    description: string | null
    category: string
    skill_content: string
    triggers?: unknown
  }
}

// ============================================
// DELEGATION TYPES
// ============================================

export interface AgentDelegation {
  id: string
  from_agent_id: string
  to_agent_id: string
  condition: string | null
  context_template: string | null
  created_at: string
  to_agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
  from_agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// ============================================
// RULE TYPES
// ============================================

export type RuleType = 'always' | 'never' | 'when' | 'respond_with'

export interface AgentRule {
  id: string
  agent_id: string
  rule_type: RuleType
  rule_content: string
  condition: string | null
  priority: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// ============================================
// PROMPT SECTION TYPES
// ============================================

export type PromptSectionType = 'identity' | 'personality' | 'capabilities' | 'constraints' | 'examples' | 'custom'

export interface AgentPromptSection {
  id: string
  agent_id: string
  section_type: PromptSectionType
  section_title: string
  section_content: string
  position: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// ============================================
// VERSION TYPES
// ============================================

export type AgentChangeType = 'created' | 'identity' | 'tools' | 'skills' | 'prompt' | 'team' | 'rules' | 'rollback' | 'published'

export interface AgentVersion {
  id: string
  agent_id: string
  version: number
  config_snapshot: AgentSDKConfig
  change_type: AgentChangeType
  change_description: string | null
  change_details: Record<string, unknown>
  is_published: boolean
  published_at: string | null
  published_by: string | null
  created_by: string | null
  created_at: string
}

// ============================================
// TEST SESSION TYPES
// ============================================

export type TestSessionStatus = 'active' | 'completed' | 'failed' | 'timeout'
export type TestToolMode = 'mock' | 'simulate' | 'live'

export interface AgentTestSession {
  id: string
  agent_id: string
  version: number
  started_by: string
  started_at: string
  ended_at: string | null
  test_config: TestSessionConfig
  total_turns: number
  total_tokens: number
  total_cost_usd: number
  status: TestSessionStatus
  error_message: string | null
  notes: string | null
}

export interface TestSessionConfig {
  tool_mode: TestToolMode
  mock_responses?: Record<string, unknown>
}

export type TestMessageRole = 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result'

export interface AgentTestMessage {
  id: string
  session_id: string
  role: TestMessageRole
  content: string
  tool_name: string | null
  tool_input: Record<string, unknown> | null
  tool_output: Record<string, unknown> | null
  tool_use_id: string | null
  latency_ms: number | null
  tokens_input: number | null
  tokens_output: number | null
  sequence_number: number
  created_at: string
}

// ============================================
// PROMPT TEMPLATE TYPES
// ============================================

export interface AgentPromptTemplate {
  id: string
  name: string
  description: string | null
  role: string
  department: string | null
  sections: PromptTemplateSection[]
  is_system: boolean
  created_at: string
}

export interface PromptTemplateSection {
  type: PromptSectionType
  title: string
  content: string
}

// ============================================
// SDK CONFIG TYPES (Agent SDK Compatible)
// ============================================

export interface AgentSDKConfig {
  name: string
  slug?: string
  description?: string
  model: SDKModelName
  systemPrompt: string
  maxTurns: number
  permissionMode: PermissionMode
  tools: SDKTool[]
  skills?: SDKSkill[]
  rules?: SDKRule[]
  promptSections?: SDKPromptSection[]
  delegations?: SDKDelegation[]
  isHead?: boolean
  departmentId?: string
}

export type SDKModelName =
  | 'claude-sonnet-4-20250514'
  | 'claude-opus-4-20250514'
  | 'claude-3-5-haiku-20241022'

export interface SDKTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface SDKSkill {
  name: string
  description?: string
  content: string
  triggers?: string[]
}

export interface SDKRule {
  type: RuleType
  content: string
  condition?: string
  priority: number
}

export interface SDKPromptSection {
  type: PromptSectionType
  title: string
  content: string
  position: number
}

export interface SDKDelegation {
  toAgent: string
  toAgentId: string
  condition?: string
  contextTemplate?: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateAgentRequest {
  name: string
  slug?: string
  description?: string
  department_id?: string
  avatar_url?: string
  model?: AgentModel
  system_prompt: string
  permission_mode?: PermissionMode
  max_turns?: number
  is_head?: boolean
}

export interface UpdateAgentRequest {
  name?: string
  slug?: string
  description?: string
  department_id?: string | null
  avatar_url?: string | null
  model?: AgentModel
  system_prompt?: string
  permission_mode?: PermissionMode
  max_turns?: number
  is_enabled?: boolean
  is_head?: boolean
}

export interface UpdateAgentToolsRequest {
  tool_ids: string[]
  configs?: Record<string, Record<string, unknown>>
}

export interface UpdateAgentSkillsRequest {
  skill_ids: string[]
}

export interface CreateAgentRuleRequest {
  rule_type: RuleType
  rule_content: string
  condition?: string
  priority?: number
}

export interface UpdateAgentRuleRequest {
  rule_type?: RuleType
  rule_content?: string
  condition?: string
  priority?: number
  is_enabled?: boolean
}

export interface UpdateAgentDelegationsRequest {
  delegations: {
    to_agent_id: string
    condition?: string
    context_template?: string
  }[]
}

export interface CreateAgentPromptSectionRequest {
  section_type: PromptSectionType
  section_title: string
  section_content: string
  position?: number
}

export interface UpdateAgentPromptSectionRequest {
  section_type?: PromptSectionType
  section_title?: string
  section_content?: string
  position?: number
  is_enabled?: boolean
}

export interface ReorderPromptSectionsRequest {
  section_ids: string[]
}

export interface CreateAgentVersionRequest {
  change_type: AgentChangeType
  change_description?: string
  change_details?: Record<string, unknown>
}

export interface PublishAgentVersionRequest {
  version: number
}

export interface CreateTestSessionRequest {
  tool_mode?: TestToolMode
  mock_responses?: Record<string, unknown>
}

export interface SendTestMessageRequest {
  content: string
}

export interface EndTestSessionRequest {
  notes?: string
}

// API Response Types

export interface AgentDetailResponse {
  agent: AgentWithRelations
  versions: AgentVersion[]
  sdkConfig: AgentSDKConfig
}

export interface AgentListResponse {
  agents: Agent[]
  total: number
  limit: number
  offset: number
}

export interface TestSessionResponse {
  session: AgentTestSession
  messages: AgentTestMessage[]
}

export interface TestMessageResponse {
  message: AgentTestMessage
  assistantMessage?: AgentTestMessage
  toolCalls?: AgentTestMessage[]
}

// ============================================
// HELPER FUNCTIONS (for use in components)
// ============================================

export const MODEL_DISPLAY_NAMES: Record<AgentModel, string> = {
  haiku: 'Claude 3.5 Haiku',
  sonnet: 'Claude Sonnet 4',
  opus: 'Claude Opus 4'
}

export const MODEL_SDK_NAMES: Record<AgentModel, SDKModelName> = {
  haiku: 'claude-3-5-haiku-20241022',
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514'
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  always: 'Always',
  never: 'Never',
  when: 'When',
  respond_with: 'Respond With'
}

export const RULE_TYPE_DESCRIPTIONS: Record<RuleType, string> = {
  always: 'Rules the agent must always follow',
  never: 'Things the agent must never do',
  when: 'Conditional rules triggered by specific situations',
  respond_with: 'Predefined responses for specific triggers'
}

export const SECTION_TYPE_LABELS: Record<PromptSectionType, string> = {
  identity: 'Identity',
  personality: 'Personality',
  capabilities: 'Capabilities',
  constraints: 'Constraints',
  examples: 'Examples',
  custom: 'Custom'
}

export const SECTION_TYPE_DESCRIPTIONS: Record<PromptSectionType, string> = {
  identity: 'Who the agent is and their role',
  personality: 'Tone, style, and communication approach',
  capabilities: 'What the agent can do and their expertise',
  constraints: 'Boundaries, limitations, and what to avoid',
  examples: 'Few-shot examples of ideal behavior',
  custom: 'Additional custom instructions'
}

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  finance: 'Finance',
  crm: 'CRM',
  team: 'Team',
  projects: 'Projects',
  knowledge: 'Knowledge',
  communications: 'Communications',
  goals: 'Goals & KPIs',
  agents: 'Agents'
}

export const TOOL_CATEGORY_ICONS: Record<ToolCategory, string> = {
  finance: 'dollar-sign',
  crm: 'users',
  team: 'users-round',
  projects: 'folder-kanban',
  knowledge: 'book-open',
  communications: 'phone',
  goals: 'target',
  agents: 'bot'
}

// ============================================
// SCHEDULE TYPES
// ============================================

export type ScheduleExecutionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface AgentSchedule {
  id: string
  agent_id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  task_prompt: string
  requires_approval: boolean
  output_config: Record<string, unknown>
  is_enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AgentScheduleWithAgent extends AgentSchedule {
  agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

export interface AgentScheduleExecution {
  id: string
  schedule_id: string
  agent_id: string
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  status: ScheduleExecutionStatus
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  result: Record<string, unknown> | null
  tool_calls: Record<string, unknown>[] | null
  error_message: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  duration_ms: number | null
  created_at: string
}

export interface AgentScheduleExecutionWithDetails extends AgentScheduleExecution {
  schedule?: AgentSchedule
  agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
  approved_by_user?: {
    id: string
    email: string
  }
}

// Schedule API Request/Response Types

export interface CreateScheduleRequest {
  name: string
  description?: string
  cron_expression: string
  timezone?: string
  task_prompt: string
  requires_approval?: boolean
  output_config?: Record<string, unknown>
}

export interface UpdateScheduleRequest {
  name?: string
  description?: string
  cron_expression?: string
  timezone?: string
  task_prompt?: string
  requires_approval?: boolean
  output_config?: Record<string, unknown>
  is_enabled?: boolean
}

// Schedule presets for UI
export const SCHEDULE_PRESETS = [
  { label: 'Daily', value: 'daily', cron: '0 9 * * *', description: 'Every day at 9:00 AM' },
  { label: 'Weekly', value: 'weekly', cron: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
  { label: 'Monthly', value: 'monthly', cron: '0 9 1 * *', description: '1st of each month at 9:00 AM' },
  { label: 'Quarterly', value: 'quarterly', cron: '0 9 1 1,4,7,10 *', description: 'Jan, Apr, Jul, Oct 1st at 9:00 AM' },
  { label: 'Custom', value: 'custom', cron: '', description: 'Define your own schedule' }
] as const

export const EXECUTION_STATUS_LABELS: Record<ScheduleExecutionStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

export const EXECUTION_STATUS_COLORS: Record<ScheduleExecutionStatus, string> = {
  pending_approval: 'yellow',
  approved: 'blue',
  rejected: 'red',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  cancelled: 'gray'
}
