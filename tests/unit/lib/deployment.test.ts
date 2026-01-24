import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyCustomizations } from '@/lib/deployment'
import type { DeployedTeamConfig, Customizations, DeployedAgent, DeployedMind } from '@/types/teams'

// Mock supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('deployment', () => {
  describe('applyCustomizations', () => {
    let baseConfig: DeployedTeamConfig

    beforeEach(() => {
      baseConfig = createMockBaseConfig()
    })

    it('disables agents in the disabled list', () => {
      const customizations: Customizations = {
        disabled_agents: ['agent-1'],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {},
      }

      const result = applyCustomizations(baseConfig, customizations)

      const agent1 = result.agents.find(a => a.slug === 'agent-1')
      const agent2 = result.agents.find(a => a.slug === 'agent-2')

      expect(agent1?.is_enabled).toBe(false)
      expect(agent2?.is_enabled).toBe(true)
    })

    it('disables delegations in the disabled list', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: ['delegation-1'],
        added_mind: [],
        agent_overrides: {},
      }

      const result = applyCustomizations(baseConfig, customizations)

      const del1 = result.delegations.find(d => d.id === 'delegation-1')
      const del2 = result.delegations.find(d => d.id === 'delegation-2')

      expect(del1?.is_enabled).toBe(false)
      expect(del2?.is_enabled).toBe(true)
    })

    it('adds workspace-specific mind files', () => {
      const addedMind: DeployedMind[] = [
        { id: 'mind-new', name: 'Workspace Rules', slug: 'workspace-rules', content: 'Custom rules', category: 'rules' },
      ]

      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: addedMind,
        agent_overrides: {},
      }

      const result = applyCustomizations(baseConfig, customizations)

      expect(result.team_mind).toHaveLength(baseConfig.team_mind.length + 1)
      expect(result.team_mind.some(m => m.id === 'mind-new')).toBe(true)
    })

    it('applies agent model overrides', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {
          'agent-1': { model: 'opus' },
        },
      }

      const result = applyCustomizations(baseConfig, customizations)

      const agent1 = result.agents.find(a => a.slug === 'agent-1')
      expect(agent1?.model).toBe('opus')
    })

    it('applies agent system_prompt overrides', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {
          'agent-2': { system_prompt: 'Custom prompt for workspace' },
        },
      }

      const result = applyCustomizations(baseConfig, customizations)

      const agent2 = result.agents.find(a => a.slug === 'agent-2')
      expect(agent2?.system_prompt).toBe('Custom prompt for workspace')
    })

    it('applies agent is_enabled overrides', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {
          'agent-1': { is_enabled: false },
        },
      }

      const result = applyCustomizations(baseConfig, customizations)

      const agent1 = result.agents.find(a => a.slug === 'agent-1')
      expect(agent1?.is_enabled).toBe(false)
    })

    it('does not modify the original base config', () => {
      const originalAgent1Enabled = baseConfig.agents.find(a => a.slug === 'agent-1')?.is_enabled

      const customizations: Customizations = {
        disabled_agents: ['agent-1'],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {},
      }

      applyCustomizations(baseConfig, customizations)

      // Original should be unchanged
      const currentAgent1Enabled = baseConfig.agents.find(a => a.slug === 'agent-1')?.is_enabled
      expect(currentAgent1Enabled).toBe(originalAgent1Enabled)
    })

    it('handles empty customizations', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {},
      }

      const result = applyCustomizations(baseConfig, customizations)

      // Should be equivalent to base config
      expect(result.agents.length).toBe(baseConfig.agents.length)
      expect(result.delegations.length).toBe(baseConfig.delegations.length)
      expect(result.team_mind.length).toBe(baseConfig.team_mind.length)
    })

    it('handles nonexistent agent slug in overrides gracefully', () => {
      const customizations: Customizations = {
        disabled_agents: [],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {
          'nonexistent-agent': { model: 'opus' },
        },
      }

      // Should not throw
      expect(() => applyCustomizations(baseConfig, customizations)).not.toThrow()
    })

    it('combines disabled_agents with agent_overrides is_enabled', () => {
      const customizations: Customizations = {
        disabled_agents: ['agent-1'],
        disabled_delegations: [],
        added_mind: [],
        agent_overrides: {
          'agent-2': { is_enabled: false },
        },
      }

      const result = applyCustomizations(baseConfig, customizations)

      const agent1 = result.agents.find(a => a.slug === 'agent-1')
      const agent2 = result.agents.find(a => a.slug === 'agent-2')

      expect(agent1?.is_enabled).toBe(false)
      expect(agent2?.is_enabled).toBe(false)
    })
  })
})

// Helper to create mock base config
function createMockBaseConfig(): DeployedTeamConfig {
  const agents: DeployedAgent[] = [
    {
      id: 'agent-id-1',
      slug: 'agent-1',
      name: 'Agent 1',
      description: 'First agent',
      avatar_url: null,
      system_prompt: 'You are agent 1',
      model: 'sonnet',
      is_enabled: true,
      tools: [],
      skills: [],
      mind: [],
      rules: [],
    },
    {
      id: 'agent-id-2',
      slug: 'agent-2',
      name: 'Agent 2',
      description: 'Second agent',
      avatar_url: null,
      system_prompt: 'You are agent 2',
      model: 'haiku',
      is_enabled: true,
      tools: [],
      skills: [],
      mind: [],
      rules: [],
    },
  ]

  return {
    team: {
      id: 'team-1',
      name: 'Test Team',
      slug: 'test-team',
      head_agent_id: 'agent-id-1',
    },
    agents,
    delegations: [
      {
        id: 'delegation-1',
        from_agent_slug: 'agent-1',
        to_agent_slug: 'agent-2',
        condition: 'When specialized help needed',
        context_template: 'Context template',
        is_enabled: true,
      },
      {
        id: 'delegation-2',
        from_agent_slug: 'agent-2',
        to_agent_slug: 'agent-1',
        condition: 'When escalation needed',
        context_template: 'Context template',
        is_enabled: true,
      },
    ],
    team_mind: [
      { id: 'mind-1', name: 'Team Guidelines', slug: 'guidelines', content: 'Guidelines content', category: 'general' },
    ],
  }
}
