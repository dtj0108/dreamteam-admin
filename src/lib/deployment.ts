// Deployment helpers for workspace team deployment
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  DeployedTeamConfig,
  DeployedAgent,
  DeployedDelegation,
  DeployedMind,
  DeployedTool,
  DeployedSkill,
  DeployedRule,
  Customizations,
  WorkspaceDeployedTeam,
  DeploymentAgentResources,
  DeploymentResult,
} from '@/types/teams'

/**
 * Build a complete config snapshot from a team template.
 * This is used when deploying a team to a workspace.
 */
export async function buildConfigSnapshot(teamId: string): Promise<DeployedTeamConfig> {
  const supabase = createAdminClient()

  // Get team with head agent
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, slug, head_agent_id')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    throw new Error(`Team not found: ${teamId}`)
  }

  // Get team agents with full agent details
  const { data: teamAgents, error: agentsError } = await supabase
    .from('team_agents')
    .select(`
      agent_id,
      role,
      display_order,
      agent:ai_agents(
        id,
        name,
        slug,
        description,
        avatar_url,
        system_prompt,
        model,
        provider
      )
    `)
    .eq('team_id', teamId)
    .order('display_order')

  if (agentsError) {
    throw new Error(`Failed to load team agents: ${agentsError.message}`)
  }

  // Build deployed agents with their tools, skills, mind, and rules
  const agents: DeployedAgent[] = await Promise.all(
    (teamAgents || []).map(async (ta) => {
      // Supabase returns relations as single objects for foreign keys
      const agentData = ta.agent as unknown as {
        id: string
        name: string
        slug: string
        description: string | null
        avatar_url: string | null
        system_prompt: string
        model: string
        provider: string | null
      } | null

      if (!agentData) {
        throw new Error('Team agent has no associated agent')
      }

      const agent = agentData

      // Get agent tools
      const { data: agentTools } = await supabase
        .from('ai_agent_tools')
        .select(`
          tool:agent_tools(
            id,
            name,
            description,
            input_schema
          )
        `)
        .eq('agent_id', agent.id)

      const tools: DeployedTool[] = (agentTools || [])
        .filter((at) => at.tool)
        .map((at) => {
          const tool = at.tool as unknown as { id: string; name: string; description: string; input_schema: Record<string, unknown> }
          return {
            id: tool.id,
            name: tool.name,
            description: tool.description || '',
            input_schema: tool.input_schema || {},
          }
        })

      // Warn if agent has no tools assigned (helpful for debugging)
      if (tools.length === 0) {
        console.warn(`[deployment] Agent "${agent.name}" (${agent.id}) has no tools assigned`)
      }

      // Get agent skills
      const { data: agentSkills } = await supabase
        .from('ai_agent_skills')
        .select(`
          skill:agent_skills(
            id,
            name,
            skill_content
          )
        `)
        .eq('agent_id', agent.id)

      const skills: DeployedSkill[] = (agentSkills || [])
        .filter((as) => as.skill)
        .map((as) => {
          const skill = as.skill as unknown as { id: string; name: string; skill_content: string }
          return {
            id: skill.id,
            name: skill.name,
            slug: skill.name.toLowerCase().replace(/\s+/g, '-'),
            content: skill.skill_content,
          }
        })

      // Get agent mind (from agent_mind table if exists)
      const { data: agentMind } = await supabase
        .from('agent_mind')
        .select('id, name, slug, content, category')
        .eq('agent_id', agent.id)
        .eq('is_enabled', true)

      const mind: DeployedMind[] = (agentMind || []).map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        content: m.content,
        category: m.category || 'general',
      }))

      // Get agent rules
      const { data: agentRules } = await supabase
        .from('agent_rules')
        .select('id, rule_type, rule_content, priority')
        .eq('agent_id', agent.id)
        .eq('is_enabled', true)
        .order('priority')

      const rules: DeployedRule[] = (agentRules || []).map((r) => ({
        id: r.id,
        rule_type: r.rule_type,
        content: r.rule_content,
        priority: r.priority || 0,
      }))

      return {
        id: agent.id,
        slug: agent.slug || agent.name.toLowerCase().replace(/\s+/g, '-'),
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        system_prompt: agent.system_prompt,
        model: agent.model || 'sonnet',
        provider: agent.provider || 'anthropic',
        is_enabled: true,
        tools,
        skills,
        mind,
        rules,
      }
    })
  )

  // Get team delegations
  const { data: teamDelegations, error: delegationsError } = await supabase
    .from('team_delegations')
    .select(`
      id,
      from_agent_id,
      to_agent_id,
      condition,
      context_template,
      from_agent:ai_agents!team_delegations_from_agent_id_fkey(slug),
      to_agent:ai_agents!team_delegations_to_agent_id_fkey(slug)
    `)
    .eq('team_id', teamId)

  if (delegationsError) {
    throw new Error(`Failed to load team delegations: ${delegationsError.message}`)
  }

  const delegations: DeployedDelegation[] = (teamDelegations || []).map((d) => {
    const fromAgent = d.from_agent as unknown as { slug: string } | null
    const toAgent = d.to_agent as unknown as { slug: string } | null
    return {
      id: d.id,
      from_agent_slug: fromAgent?.slug || '',
      to_agent_slug: toAgent?.slug || '',
      condition: d.condition,
      context_template: d.context_template,
      is_enabled: true,
    }
  })

  // Get team mind files
  const { data: teamMindData } = await supabase
    .from('team_mind')
    .select(`
      mind:agent_mind(
        id,
        name,
        slug,
        content,
        category
      )
    `)
    .eq('team_id', teamId)

  const team_mind: DeployedMind[] = (teamMindData || [])
    .filter((tm) => tm.mind)
    .map((tm) => {
      const mind = tm.mind as unknown as { id: string; name: string; slug: string; content: string; category: string }
      return {
        id: mind.id,
        name: mind.name,
        slug: mind.slug,
        content: mind.content,
        category: mind.category || 'general',
      }
    })

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      head_agent_id: team.head_agent_id,
    },
    agents,
    delegations,
    team_mind,
  }
}

/**
 * Apply workspace customizations to a base config to produce the active config.
 */
export function applyCustomizations(
  baseConfig: DeployedTeamConfig,
  customizations: Customizations
): DeployedTeamConfig {
  // Deep clone the base config
  const config: DeployedTeamConfig = JSON.parse(JSON.stringify(baseConfig))

  // Disable agents that are in the disabled list
  const disabledAgents = customizations.disabled_agents || []
  for (const agent of config.agents) {
    agent.is_enabled = !disabledAgents.includes(agent.slug)
  }

  // Disable delegations that are in the disabled list
  const disabledDelegations = customizations.disabled_delegations || []
  for (const delegation of config.delegations) {
    delegation.is_enabled = !disabledDelegations.includes(delegation.id)
  }

  // Add workspace-specific mind files
  const addedMind = customizations.added_mind || []
  config.team_mind = [...config.team_mind, ...addedMind]

  // Apply per-agent overrides
  const agentOverrides = customizations.agent_overrides || {}
  for (const [slug, overrides] of Object.entries(agentOverrides)) {
    const agent = config.agents.find((a) => a.slug === slug)
    if (agent && overrides) {
      // Only apply safe overrides (not id, slug, etc.)
      if (overrides.system_prompt !== undefined) {
        agent.system_prompt = overrides.system_prompt
      }
      if (overrides.model !== undefined) {
        agent.model = overrides.model
      }
      if (overrides.is_enabled !== undefined) {
        agent.is_enabled = overrides.is_enabled
      }
    }
  }

  return config
}

/**
 * Deploy a team to one or more workspaces.
 */
export async function deployTeamToWorkspaces(
  teamId: string,
  workspaceIds: string[],
  deployedByUserId: string
): Promise<{ success: string[]; failed: Array<{ workspaceId: string; error: string }> }> {
  const supabase = createAdminClient()
  const success: string[] = []
  const failed: Array<{ workspaceId: string; error: string }> = []

  // Get team version
  const { data: team } = await supabase
    .from('teams')
    .select('current_version')
    .eq('id', teamId)
    .single()

  const sourceVersion = team?.current_version || 1

  // Build config snapshot once
  let baseConfig: DeployedTeamConfig
  try {
    baseConfig = await buildConfigSnapshot(teamId)
  } catch (error) {
    throw new Error(`Failed to build config snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Deploy to each workspace
  for (const workspaceId of workspaceIds) {
    try {
      // Get existing active deployment (if any) for rollback reference
      const { data: existingDeployment } = await supabase
        .from('workspace_deployed_teams')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .single()

      // Mark existing deployment as replaced
      if (existingDeployment) {
        await supabase
          .from('workspace_deployed_teams')
          .update({ status: 'replaced' })
          .eq('id', existingDeployment.id)
      }

      // Create new deployment
      const { error: insertError } = await supabase
        .from('workspace_deployed_teams')
        .insert({
          workspace_id: workspaceId,
          source_team_id: teamId,
          source_version: sourceVersion,
          base_config: baseConfig,
          customizations: {},
          active_config: baseConfig,
          deployed_by: deployedByUserId,
          status: 'active',
          previous_deployment_id: existingDeployment?.id || null,
        })

      if (insertError) {
        failed.push({ workspaceId, error: insertError.message })
      } else {
        success.push(workspaceId)
      }
    } catch (error) {
      failed.push({
        workspaceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { success, failed }
}

/**
 * Get a workspace's active deployed team config.
 */
export async function getWorkspaceDeployedTeam(
  workspaceId: string
): Promise<WorkspaceDeployedTeam | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('workspace_deployed_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return data as WorkspaceDeployedTeam
}

/**
 * Update workspace customizations and recompute active config.
 */
export async function updateWorkspaceCustomizations(
  workspaceId: string,
  customizations: Partial<Customizations>,
  customizedByUserId: string
): Promise<WorkspaceDeployedTeam> {
  const supabase = createAdminClient()

  // Get current deployment
  const { data: deployment, error: fetchError } = await supabase
    .from('workspace_deployed_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  if (fetchError || !deployment) {
    throw new Error('No active deployment found for workspace')
  }

  // Merge customizations
  const currentCustomizations = (deployment.customizations as Customizations) || {
    disabled_agents: [],
    disabled_delegations: [],
    added_mind: [],
    agent_overrides: {},
  }

  const newCustomizations: Customizations = {
    disabled_agents: customizations.disabled_agents ?? currentCustomizations.disabled_agents,
    disabled_delegations: customizations.disabled_delegations ?? currentCustomizations.disabled_delegations,
    added_mind: customizations.added_mind ?? currentCustomizations.added_mind,
    agent_overrides: customizations.agent_overrides ?? currentCustomizations.agent_overrides,
  }

  // Compute active config
  const activeConfig = applyCustomizations(
    deployment.base_config as DeployedTeamConfig,
    newCustomizations
  )

  // Update deployment
  const { data: updated, error: updateError } = await supabase
    .from('workspace_deployed_teams')
    .update({
      customizations: newCustomizations,
      active_config: activeConfig,
      last_customized_at: new Date().toISOString(),
      last_customized_by: customizedByUserId,
    })
    .eq('id', deployment.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to update customizations: ${updateError.message}`)
  }

  return updated as WorkspaceDeployedTeam
}

/**
 * Reset workspace customizations to match the base config.
 */
export async function resetWorkspaceCustomizations(
  workspaceId: string,
  resetByUserId: string
): Promise<WorkspaceDeployedTeam> {
  const supabase = createAdminClient()

  // Get current deployment
  const { data: deployment, error: fetchError } = await supabase
    .from('workspace_deployed_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  if (fetchError || !deployment) {
    throw new Error('No active deployment found for workspace')
  }

  const emptyCustomizations: Customizations = {
    disabled_agents: [],
    disabled_delegations: [],
    added_mind: [],
    agent_overrides: {},
  }

  // Update deployment with empty customizations
  const { data: updated, error: updateError } = await supabase
    .from('workspace_deployed_teams')
    .update({
      customizations: emptyCustomizations,
      active_config: deployment.base_config,
      last_customized_at: new Date().toISOString(),
      last_customized_by: resetByUserId,
    })
    .eq('id', deployment.id)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Failed to reset customizations: ${updateError.message}`)
  }

  return updated as WorkspaceDeployedTeam
}

/**
 * Upgrade workspace to latest team template version.
 * Preserves customizations while updating the base config.
 */
export async function upgradeWorkspaceDeployment(
  workspaceId: string,
  upgradedByUserId: string
): Promise<WorkspaceDeployedTeam> {
  const supabase = createAdminClient()

  // Get current deployment
  const { data: deployment, error: fetchError } = await supabase
    .from('workspace_deployed_teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single()

  if (fetchError || !deployment) {
    throw new Error('No active deployment found for workspace')
  }

  // Get current team version
  const { data: team } = await supabase
    .from('teams')
    .select('current_version')
    .eq('id', deployment.source_team_id)
    .single()

  const latestVersion = team?.current_version || 1

  // Check if already at latest
  if (deployment.source_version === latestVersion) {
    return deployment as WorkspaceDeployedTeam
  }

  // Build new base config
  const newBaseConfig = await buildConfigSnapshot(deployment.source_team_id)

  // Preserve customizations and recompute active config
  const customizations = (deployment.customizations as Customizations) || {
    disabled_agents: [],
    disabled_delegations: [],
    added_mind: [],
    agent_overrides: {},
  }
  const newActiveConfig = applyCustomizations(newBaseConfig, customizations)

  // Mark current as replaced, create new deployment
  await supabase
    .from('workspace_deployed_teams')
    .update({ status: 'replaced' })
    .eq('id', deployment.id)

  const { data: newDeployment, error: insertError } = await supabase
    .from('workspace_deployed_teams')
    .insert({
      workspace_id: workspaceId,
      source_team_id: deployment.source_team_id,
      source_version: latestVersion,
      base_config: newBaseConfig,
      customizations: customizations,
      active_config: newActiveConfig,
      deployed_by: upgradedByUserId,
      status: 'active',
      previous_deployment_id: deployment.id,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create upgraded deployment: ${insertError.message}`)
  }

  return newDeployment as WorkspaceDeployedTeam
}

/**
 * Undeploy (deactivate) a workspace's team.
 */
export async function undeployWorkspaceTeam(workspaceId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('workspace_deployed_teams')
    .update({ status: 'paused' })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  if (error) {
    throw new Error(`Failed to undeploy team: ${error.message}`)
  }
}

/**
 * Refresh all active deployments by rebuilding their configs from source.
 * This updates both base_config and active_config with fresh data from
 * the source team, including current tool assignments from ai_agent_tools.
 */
export async function refreshAllDeployments(
  refreshedByUserId: string
): Promise<{ success: number; failed: Array<{ id: string; error: string }> }> {
  const supabase = createAdminClient()

  // Get all active deployments
  const { data: deployments, error: fetchError } = await supabase
    .from('workspace_deployed_teams')
    .select('id, source_team_id, customizations')
    .eq('status', 'active')

  if (fetchError) {
    throw new Error(`Failed to fetch active deployments: ${fetchError.message}`)
  }

  if (!deployments || deployments.length === 0) {
    return { success: 0, failed: [] }
  }

  let successCount = 0
  const failed: Array<{ id: string; error: string }> = []

  // Group deployments by source_team_id to avoid rebuilding the same config multiple times
  const deploymentsByTeam = new Map<string, typeof deployments>()
  for (const deployment of deployments) {
    const teamId = deployment.source_team_id
    if (!deploymentsByTeam.has(teamId)) {
      deploymentsByTeam.set(teamId, [])
    }
    deploymentsByTeam.get(teamId)!.push(deployment)
  }

  // Process each team's deployments
  for (const [teamId, teamDeployments] of deploymentsByTeam) {
    // Build fresh config snapshot once per team
    let freshBaseConfig: DeployedTeamConfig
    try {
      freshBaseConfig = await buildConfigSnapshot(teamId)
    } catch (error) {
      // If we can't build the config, fail all deployments for this team
      for (const deployment of teamDeployments) {
        failed.push({
          id: deployment.id,
          error: `Failed to build config for team ${teamId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
      continue
    }

    // Update each deployment with the fresh config
    for (const deployment of teamDeployments) {
      try {
        // Apply existing customizations to get the active config
        const customizations = (deployment.customizations as Customizations) || {
          disabled_agents: [],
          disabled_delegations: [],
          added_mind: [],
          agent_overrides: {},
        }
        const freshActiveConfig = applyCustomizations(freshBaseConfig, customizations)

        // Update the deployment
        const { error: updateError } = await supabase
          .from('workspace_deployed_teams')
          .update({
            base_config: freshBaseConfig,
            active_config: freshActiveConfig,
            last_customized_at: new Date().toISOString(),
            last_customized_by: refreshedByUserId,
          })
          .eq('id', deployment.id)

        if (updateError) {
          failed.push({ id: deployment.id, error: updateError.message })
        } else {
          successCount++
        }
      } catch (error) {
        failed.push({
          id: deployment.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  return { success: successCount, failed }
}

// ============================================
// AGENT PROFILE & CHANNEL MANAGEMENT
// ============================================

/**
 * Generate a unique email for an agent profile.
 * Uses format: {agent_slug}@agent.workspace-{workspace_id}.local
 */
function generateAgentEmail(agentSlug: string, workspaceId: string): string {
  return `${agentSlug}@agent.workspace-${workspaceId.substring(0, 8)}.local`
}

/**
 * Create an agent profile in the profiles table.
 * Agent profiles allow agents to appear as "users" in channels.
 */
export async function createAgentProfile(
  workspaceId: string,
  agent: DeployedAgent
): Promise<string> {
  const supabase = createAdminClient()

  const email = generateAgentEmail(agent.slug, workspaceId)

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('linked_agent_id', agent.id)
    .eq('agent_workspace_id', workspaceId)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new agent profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      email,
      full_name: agent.name,
      avatar_url: agent.avatar_url,
      is_agent: true,
      agent_slug: agent.slug,
      linked_agent_id: agent.id,
      agent_workspace_id: workspaceId,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create agent profile for ${agent.slug}: ${error.message}`)
  }

  return profile.id
}

/**
 * Add an agent profile as a member of a workspace.
 */
export async function addAgentToWorkspace(
  workspaceId: string,
  profileId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Check if membership already exists
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('profile_id', profileId)
    .single()

  if (existing) {
    return // Already a member
  }

  const { error } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      profile_id: profileId,
      role: 'member', // Agents are members, not owners
    })

  if (error) {
    throw new Error(`Failed to add agent to workspace: ${error.message}`)
  }
}

/**
 * Create an agent channel for communication with a specific agent.
 * Channel name format: #agent-{slug}
 */
export async function createAgentChannel(
  workspaceId: string,
  agent: DeployedAgent,
  creatorProfileId: string
): Promise<string> {
  const supabase = createAdminClient()

  const channelName = `agent-${agent.slug}`

  // Check if channel already exists
  const { data: existing } = await supabase
    .from('channels')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', channelName)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new agent channel
  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      name: channelName,
      description: `Communication channel for ${agent.name}`,
      is_agent_channel: true,
      linked_agent_id: agent.id,
      created_by: creatorProfileId,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create agent channel for ${agent.slug}: ${error.message}`)
  }

  return channel.id
}

/**
 * Add a profile as a member of a channel.
 */
export async function addProfileToChannel(
  channelId: string,
  profileId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Check if membership already exists
  const { data: existing } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('profile_id', profileId)
    .single()

  if (existing) {
    return // Already a member
  }

  const { error } = await supabase
    .from('channel_members')
    .insert({
      channel_id: channelId,
      profile_id: profileId,
    })

  if (error) {
    throw new Error(`Failed to add profile to channel: ${error.message}`)
  }
}

/**
 * Set up all agent resources (profiles, channels, memberships) for a deployment.
 * Called after deploying a team to a workspace.
 */
export async function setupAgentResources(
  workspaceId: string,
  config: DeployedTeamConfig,
  deployedByUserId: string
): Promise<DeploymentAgentResources[]> {
  const resources: DeploymentAgentResources[] = []
  const agentProfileIds: string[] = []

  // 1. Create agent profiles for all enabled agents
  for (const agent of config.agents) {
    if (!agent.is_enabled) continue

    const profileId = await createAgentProfile(workspaceId, agent)
    agentProfileIds.push(profileId)

    // Add agent to workspace as member
    await addAgentToWorkspace(workspaceId, profileId)

    resources.push({
      profile_id: profileId,
      channel_id: '', // Will be filled after creating channels
      agent_slug: agent.slug,
      agent_name: agent.name,
    })
  }

  // 2. Create agent channels for all enabled agents
  // Use the deployer's profile ID as the channel creator
  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i]
    if (!agent.is_enabled) continue

    const channelId = await createAgentChannel(
      workspaceId,
      agent,
      deployedByUserId
    )

    // Update the resource with channel ID
    const resource = resources.find(r => r.agent_slug === agent.slug)
    if (resource) {
      resource.channel_id = channelId
    }

    // Add all agent profiles to this channel (so they can communicate)
    for (const profileId of agentProfileIds) {
      await addProfileToChannel(channelId, profileId)
    }

    // Also add the deployer (admin) to the channel so they can observe
    await addProfileToChannel(channelId, deployedByUserId)
  }

  return resources
}

/**
 * Deploy a team to workspaces and set up agent resources.
 * This is the main entry point that orchestrates the full deployment process.
 */
export async function deployTeamWithAgentResources(
  teamId: string,
  workspaceIds: string[],
  deployedByUserId: string
): Promise<{
  deployments: DeploymentResult[]
  failed: Array<{ workspaceId: string; error: string }>
}> {
  const deployments: DeploymentResult[] = []
  const failed: Array<{ workspaceId: string; error: string }> = []

  // First, deploy the team configurations
  const deployResult = await deployTeamToWorkspaces(teamId, workspaceIds, deployedByUserId)

  // For successful deployments, set up agent resources
  for (const workspaceId of deployResult.success) {
    try {
      // Get the deployment we just created
      const deployment = await getWorkspaceDeployedTeam(workspaceId)
      if (!deployment) {
        failed.push({ workspaceId, error: 'Deployment not found after creation' })
        continue
      }

      // Set up agent profiles and channels
      const agentResources = await setupAgentResources(
        workspaceId,
        deployment.active_config,
        deployedByUserId
      )

      deployments.push({
        workspace_id: workspaceId,
        deployment_id: deployment.id,
        agent_resources: agentResources,
      })
    } catch (error) {
      failed.push({
        workspaceId,
        error: error instanceof Error ? error.message : 'Failed to set up agent resources',
      })
    }
  }

  // Include failures from the initial deployment
  failed.push(...deployResult.failed)

  return { deployments, failed }
}

/**
 * Clean up agent resources when undeploying a team.
 * Removes agent profiles, channels, and memberships.
 */
export async function cleanupAgentResources(workspaceId: string): Promise<void> {
  const supabase = createAdminClient()

  // Get all agent profiles for this workspace
  const { data: agentProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('agent_workspace_id', workspaceId)
    .eq('is_agent', true)

  if (!agentProfiles || agentProfiles.length === 0) {
    return // No agent resources to clean up
  }

  const profileIds = agentProfiles.map(p => p.id)

  // Delete channel memberships for agent profiles
  await supabase
    .from('channel_members')
    .delete()
    .in('profile_id', profileIds)

  // Delete workspace memberships for agent profiles
  await supabase
    .from('workspace_members')
    .delete()
    .in('profile_id', profileIds)

  // Delete agent channels
  await supabase
    .from('channels')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('is_agent_channel', true)

  // Delete agent profiles
  await supabase
    .from('profiles')
    .delete()
    .eq('agent_workspace_id', workspaceId)
    .eq('is_agent', true)
}

/**
 * Get agent resources for a workspace.
 * Useful for debugging and admin views.
 */
export async function getWorkspaceAgentResources(
  workspaceId: string
): Promise<DeploymentAgentResources[]> {
  const supabase = createAdminClient()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, agent_slug, full_name, linked_agent_id')
    .eq('agent_workspace_id', workspaceId)
    .eq('is_agent', true)

  if (profilesError) {
    throw new Error(`Failed to get agent profiles: ${profilesError.message}`)
  }

  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select('id, linked_agent_id')
    .eq('workspace_id', workspaceId)
    .eq('is_agent_channel', true)

  if (channelsError) {
    throw new Error(`Failed to get agent channels: ${channelsError.message}`)
  }

  return (profiles || []).map(profile => {
    const channel = (channels || []).find(c => c.linked_agent_id === profile.linked_agent_id)
    return {
      profile_id: profile.id,
      channel_id: channel?.id || '',
      agent_slug: profile.agent_slug || '',
      agent_name: profile.full_name || '',
    }
  })
}
