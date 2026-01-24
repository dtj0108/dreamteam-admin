// Team Builder Types
import type { Agent } from './agents'

// ============================================
// MIND TYPES
// ============================================

export type MindScope = 'agent' | 'department' | 'company'

export interface MindFile {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  content: string
  content_type: string
  position: number
  is_enabled: boolean
  is_system: boolean
  workspace_id: string | null
  team_id: string | null
  scope: MindScope
  department_id: string | null
  created_at: string
}

export interface TeamMind {
  id: string
  team_id: string
  mind_id: string
  position_override: number | null
  created_at: string
  mind?: MindFile
}

// ============================================
// TEAM TYPES
// ============================================

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  head_agent_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamWithRelations extends Team {
  agents?: TeamAgent[]
  delegations?: TeamDelegation[]
  mind?: TeamMind[]
  head_agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
  agent_count?: number
  mind_count?: number
}

export interface TeamAgent {
  id: string
  team_id: string
  agent_id: string
  role: 'head' | 'member'
  display_order: number
  created_at: string
  agent?: {
    id: string
    name: string
    description: string | null
    avatar_url: string | null
    model: string
    is_enabled: boolean
  }
}

export interface TeamDelegation {
  id: string
  team_id: string
  from_agent_id: string
  to_agent_id: string
  condition: string | null
  context_template: string | null
  created_at: string
  from_agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
  to_agent?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// ============================================
// PLAN TYPES
// ============================================

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  team_id: string | null
  price_monthly: number | null
  price_yearly: number | null
  is_active: boolean
  features: string[]
  limits: Record<string, number>
  created_at: string
  updated_at: string
}

export interface PlanWithTeam extends Plan {
  team?: Team | null
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateTeamRequest {
  name: string
  slug?: string
  description?: string
  is_active?: boolean
}

export interface UpdateTeamRequest {
  name?: string
  slug?: string
  description?: string | null
  head_agent_id?: string | null
  is_active?: boolean
}

export interface UpdateTeamAgentsRequest {
  agents: {
    agent_id: string
    role?: 'head' | 'member'
    display_order?: number
  }[]
}

export interface UpdateTeamDelegationsRequest {
  delegations: {
    from_agent_id: string
    to_agent_id: string
    condition?: string
    context_template?: string
  }[]
}

export interface UpdateTeamMindRequest {
  mind_ids: string[]
}

export interface CreateTeamMindRequest {
  name: string
  slug?: string
  description?: string
  category: string
  content: string
  content_type?: string
  position?: number
  is_enabled?: boolean
  scope?: MindScope
}

export interface CreatePlanRequest {
  name: string
  slug?: string
  description?: string
  team_id?: string
  price_monthly?: number
  price_yearly?: number
  features?: string[]
  limits?: Record<string, number>
  is_active?: boolean
}

export interface UpdatePlanRequest {
  name?: string
  slug?: string
  description?: string | null
  team_id?: string | null
  price_monthly?: number | null
  price_yearly?: number | null
  features?: string[]
  limits?: Record<string, number>
  is_active?: boolean
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface TeamListResponse {
  teams: TeamWithRelations[]
}

export interface TeamDetailResponse {
  team: TeamWithRelations
}

export interface PlanListResponse {
  plans: PlanWithTeam[]
}

export interface PlanDetailResponse {
  plan: PlanWithTeam
}

// ============================================
// DEPLOYED TEAM TYPES
// ============================================

export interface DeployedAgent {
  id: string
  slug: string
  name: string
  description: string | null
  avatar_url: string | null
  system_prompt: string
  model: string  // Model name or alias (e.g., 'sonnet', 'gpt-4o', 'grok-3', 'gemini-flash')
  provider?: string  // AI provider (e.g., 'anthropic', 'openai', 'xai', 'google')
  is_enabled: boolean // Can be toggled per-workspace
  tools: DeployedTool[]
  skills: DeployedSkill[]
  mind: DeployedMind[]
  rules: DeployedRule[]
}

export interface DeployedTool {
  id: string
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface DeployedSkill {
  id: string
  name: string
  slug: string
  content: string
}

export interface DeployedMind {
  id: string
  name: string
  slug: string
  content: string
  category: string
}

export interface DeployedRule {
  id: string
  rule_type: string
  content: string
  priority: number
}

export interface DeployedDelegation {
  id: string
  from_agent_slug: string
  to_agent_slug: string
  condition: string | null
  context_template: string | null
  is_enabled: boolean // Can be toggled per-workspace
}

export interface DeployedTeamConfig {
  team: {
    id: string
    name: string
    slug: string
    head_agent_id: string | null
  }
  agents: DeployedAgent[]
  delegations: DeployedDelegation[]
  team_mind: DeployedMind[]
}

export interface Customizations {
  disabled_agents: string[] // Agent slugs to disable
  disabled_delegations: string[] // Delegation IDs to disable
  added_mind: DeployedMind[] // Workspace-specific mind files
  agent_overrides: Record<string, Partial<DeployedAgent>> // Per-agent tweaks
}

export type DeploymentStatus = 'active' | 'paused' | 'replaced' | 'failed'

export interface WorkspaceDeployedTeam {
  id: string
  workspace_id: string
  source_team_id: string
  source_version: number
  base_config: DeployedTeamConfig
  customizations: Customizations
  active_config: DeployedTeamConfig
  deployed_at: string
  deployed_by: string | null
  last_customized_at: string | null
  last_customized_by: string | null
  status: DeploymentStatus
  previous_deployment_id: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceDeployedTeamWithRelations extends WorkspaceDeployedTeam {
  source_team?: Team
  workspace?: {
    id: string
    name: string
  }
  deployed_by_profile?: {
    id: string
    email: string
    full_name: string | null
  }
}

// ============================================
// DEPLOYMENT API TYPES
// ============================================

export interface DeployTeamRequest {
  workspace_ids: string[]
}

export interface DeployTeamByPlanRequest {
  plan_slug: string
}

export interface UpdateCustomizationsRequest {
  customizations: Partial<Customizations>
}

export interface DeploymentListResponse {
  deployments: WorkspaceDeployedTeamWithRelations[]
  total: number
}

export interface DeploymentDetailResponse {
  deployment: WorkspaceDeployedTeamWithRelations
}

// ============================================
// HELPER CONSTANTS
// ============================================

export const TEAM_ROLE_LABELS: Record<string, string> = {
  head: 'Head',
  member: 'Member'
}

export const TEAM_ROLE_DESCRIPTIONS: Record<string, string> = {
  head: 'The lead agent that coordinates the team',
  member: 'A team member agent'
}

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  replaced: 'Replaced',
  failed: 'Failed'
}

export const DEPLOYMENT_STATUS_COLORS: Record<DeploymentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  replaced: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800'
}

// ============================================
// AGENT PROFILE TYPES
// ============================================

export interface AgentProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_agent: boolean
  agent_slug: string | null
  linked_agent_id: string | null
  agent_workspace_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateAgentProfileRequest {
  agent_slug: string
  full_name: string
  avatar_url?: string | null
  linked_agent_id: string
  agent_workspace_id: string
}

// ============================================
// AGENT CHANNEL TYPES
// ============================================

export interface AgentChannel {
  id: string
  workspace_id: string
  name: string
  description: string | null
  is_agent_channel: boolean
  linked_agent_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateAgentChannelRequest {
  workspace_id: string
  name: string
  description?: string
  linked_agent_id: string
}

// ============================================
// AGENT MESSAGE TYPES
// ============================================

export type AgentResponseStatus = 'pending' | 'completed' | 'timeout' | 'error'

export interface AgentMessage {
  id: string
  channel_id: string
  profile_id: string
  content: string
  is_agent_request: boolean
  agent_request_id: string | null
  agent_response_status: AgentResponseStatus | null
  created_at: string
}

export interface PostAgentMessageRequest {
  channel_id: string
  content: string
  is_agent_request?: boolean
  agent_request_id?: string
}

// ============================================
// DEPLOYMENT WITH AGENT CHANNELS
// ============================================

export interface DeploymentAgentResources {
  profile_id: string
  channel_id: string
  agent_slug: string
  agent_name: string
}

export interface DeploymentResult {
  workspace_id: string
  deployment_id: string
  agent_resources: DeploymentAgentResources[]
}
