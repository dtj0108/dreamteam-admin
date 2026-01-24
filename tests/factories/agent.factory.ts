import type { Agent } from '@/types/agents'

let agentCounter = 0

export function createAgent(overrides: Partial<Agent> = {}): Agent {
  agentCounter++

  return {
    id: overrides.id ?? `agent-${agentCounter}`,
    name: overrides.name ?? `Test Agent ${agentCounter}`,
    slug: overrides.slug ?? `test-agent-${agentCounter}`,
    description: overrides.description ?? `Description for test agent ${agentCounter}`,
    user_description: overrides.user_description ?? null,
    department_id: overrides.department_id ?? null,
    avatar_url: overrides.avatar_url ?? null,
    provider: overrides.provider ?? 'anthropic',
    model: overrides.model ?? 'sonnet',
    provider_config: overrides.provider_config ?? {},
    system_prompt: overrides.system_prompt ?? 'You are a helpful test assistant.',
    permission_mode: overrides.permission_mode ?? 'default',
    max_turns: overrides.max_turns ?? 10,
    is_enabled: overrides.is_enabled ?? true,
    is_head: overrides.is_head ?? false,
    is_system: overrides.is_system ?? false,
    workspace_id: overrides.workspace_id ?? null,
    config: overrides.config ?? {},
    plan_id: overrides.plan_id ?? null,
    current_version: overrides.current_version ?? 1,
    published_version: overrides.published_version ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
  }
}

export function createAgentList(count: number, overrides: Partial<Agent> = {}): Agent[] {
  return Array.from({ length: count }, () => createAgent(overrides))
}

// Reset counter between tests
export function resetAgentCounter() {
  agentCounter = 0
}
