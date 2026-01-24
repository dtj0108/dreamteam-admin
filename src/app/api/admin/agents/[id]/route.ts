import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig, estimateToolTokens, estimatePromptTokens } from '@/lib/agent-sdk'

// GET /api/admin/agents/[id] - Get single agent with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await params
    const supabase = createAdminClient()

    // Fetch base agent first
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      console.error('Agent fetch error:', agentError)
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Fetch department separately
    let department = null
    if (agent.department_id) {
      const { data } = await supabase
        .from('agent_departments')
        .select('id, name, icon')
        .eq('id', agent.department_id)
        .single()
      department = data
    }

    // Fetch tools
    const { data: toolAssignments } = await supabase
      .from('ai_agent_tools')
      .select('tool_id, config')
      .eq('agent_id', id)

    let tools: unknown[] = []
    if (toolAssignments && toolAssignments.length > 0) {
      const toolIds = toolAssignments.map(t => t.tool_id)
      const { data: toolData } = await supabase
        .from('agent_tools')
        .select('id, name, description, category, input_schema, is_builtin')
        .in('id', toolIds)

      tools = toolAssignments.map(ta => ({
        ...ta,
        tool: toolData?.find(t => t.id === ta.tool_id)
      }))
    }

    // Fetch skills
    const { data: skillAssignments } = await supabase
      .from('ai_agent_skills')
      .select('skill_id')
      .eq('agent_id', id)

    let skills: unknown[] = []
    if (skillAssignments && skillAssignments.length > 0) {
      const skillIds = skillAssignments.map(s => s.skill_id)
      const { data: skillData } = await supabase
        .from('agent_skills')
        .select('id, name, description, skill_content')
        .in('id', skillIds)

      skills = skillAssignments.map(sa => ({
        ...sa,
        skill: skillData?.find(s => s.id === sa.skill_id)
      }))
    }

  // Fetch mind
  let mind: unknown[] = []
  try {
    const { data: mindAssignments } = await supabase
      .from('ai_agent_mind')
      .select('mind_id, position_override')
      .eq('agent_id', id)

    if (mindAssignments && mindAssignments.length > 0) {
      const mindIds = mindAssignments.map(m => m.mind_id)
      const { data: mindData } = await supabase
        .from('agent_mind')
        .select('id, name, slug, description, category, content, content_type, position, is_enabled')
        .in('id', mindIds)

      mind = mindAssignments.map(ma => ({
        agent_id: id,
        mind_id: ma.mind_id,
        position_override: ma.position_override,
        mind: mindData?.find(m => m.id === ma.mind_id)
      }))
    }
  } catch {
    // Table might not exist yet
  }

    // Fetch delegations
    const { data: delegations } = await supabase
      .from('agent_delegations')
      .select('id, to_agent_id, condition, context_template')
      .eq('from_agent_id', id)

    // Add to_agent info for each delegation
    if (delegations && delegations.length > 0) {
      const toAgentIds = delegations.map(d => d.to_agent_id)
      const { data: toAgents } = await supabase
        .from('ai_agents')
        .select('id, name, avatar_url')
        .in('id', toAgentIds)

      delegations.forEach((d: { to_agent_id: string; to_agent?: unknown }) => {
        d.to_agent = toAgents?.find(a => a.id === d.to_agent_id)
      })
    }

    // Fetch rules (if table exists)
    let rules: unknown[] = []
    try {
      const { data: rulesData } = await supabase
        .from('agent_rules')
        .select('id, rule_type, rule_content, condition, priority, is_enabled')
        .eq('agent_id', id)
        .order('priority', { ascending: true })
      rules = rulesData || []
    } catch {
      // Table might not exist yet
    }

    // Fetch prompt sections (if table exists)
    let prompt_sections: unknown[] = []
    try {
      const { data: sectionsData } = await supabase
        .from('agent_prompt_sections')
        .select('id, section_type, section_title, section_content, position, is_enabled')
        .eq('agent_id', id)
        .order('position', { ascending: true })
      prompt_sections = sectionsData || []
    } catch {
      // Table might not exist yet
    }

    // Fetch recent versions (if table exists)
    let versions: unknown[] = []
    try {
      const { data: versionsData } = await supabase
        .from('agent_versions')
        .select('*')
        .eq('agent_id', id)
        .order('version', { ascending: false })
        .limit(20)
      versions = versionsData || []
    } catch {
      // Table might not exist yet
    }

    // Build the full agent object
    const fullAgent = {
      ...agent,
      department,
      tools,
      skills,
    mind,
      delegations: delegations || [],
      rules,
      prompt_sections
    }

    // Generate SDK config
    const sdkConfig = generateAgentSDKConfig(fullAgent)

    // Calculate token estimates
    const tokenEstimates = {
      systemPrompt: estimatePromptTokens(sdkConfig),
      tools: estimateToolTokens(sdkConfig.tools),
      total: estimatePromptTokens(sdkConfig) + estimateToolTokens(sdkConfig.tools),
      toolCount: sdkConfig.tools.length,
    }

    return NextResponse.json({
      agent: fullAgent,
      versions,
      sdkConfig,
      tokenEstimates
    })
  } catch (err) {
    console.error('Agent GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/agents/[id] - Update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const allowedFields = [
    'name', 'description', 'user_description', 'department_id', 'avatar_url',
    'provider', 'model', 'provider_config',
    'system_prompt', 'permission_mode', 'max_turns', 'is_enabled',
    'is_head', 'config', 'plan_id'
  ]
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // Valid models per provider
  const VALID_MODELS: Record<string, string[]> = {
    anthropic: ['sonnet', 'opus', 'haiku'],
    xai: ['grok-4-fast', 'grok-3', 'grok-3-mini', 'grok-2'],
  }

  // Validate provider if specified
  if (updates.provider && !['anthropic', 'xai'].includes(updates.provider as string)) {
    return NextResponse.json(
      { error: 'Invalid provider. Must be anthropic or xai' },
      { status: 400 }
    )
  }

  // Validate model matches provider
  if (updates.model || updates.provider) {
    // Need to fetch current agent to get the provider if not being updated
    const supabaseCheck = createAdminClient()
    const { data: currentAgent } = await supabaseCheck
      .from('ai_agents')
      .select('provider, model')
      .eq('id', id)
      .single()

    const provider = (updates.provider as string) || currentAgent?.provider || 'anthropic'
    const model = (updates.model as string) || currentAgent?.model

    if (!VALID_MODELS[provider]?.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model '${model}' for provider '${provider}'. Valid models: ${VALID_MODELS[provider]?.join(', ')}` },
        { status: 400 }
      )
    }
  }

  if (updates.permission_mode && !['default', 'acceptEdits', 'bypassPermissions'].includes(updates.permission_mode as string)) {
    return NextResponse.json(
      { error: 'Invalid permission_mode' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    console.error('Update agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  await logAdminAction(
    user!.id,
    'agent_updated',
    'ai_agent',
    id,
    updates,
    request
  )

  return NextResponse.json({ agent: data })
}

// DELETE /api/admin/agents/[id] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get agent name before deletion
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('name')
    .eq('id', id)
    .single()

  const { error: dbError } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('Delete agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await logAdminAction(
    user!.id,
    'agent_deleted',
    'ai_agent',
    id,
    { name: agent?.name },
    request
  )

  return NextResponse.json({ success: true })
}
