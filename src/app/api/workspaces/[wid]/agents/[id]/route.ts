import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAdmin, requireWorkspaceMember } from '@/lib/workspace-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAgentSDKConfig } from '@/lib/agent-sdk'

// GET /api/workspaces/[wid]/agents/[id] - Get agent (workspace or system)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wid: string; id: string }> }
) {
  const { wid, id } = await params
  const { error } = await requireWorkspaceMember(wid)
  if (error) return error

  const supabase = createAdminClient()

  // Fetch base agent
  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', id)
    .single()

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Check access: must be system agent or belong to this workspace
  if (!agent.is_system && agent.workspace_id !== wid) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Fetch department
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

  // Build the full agent object
  const fullAgent = {
    ...agent,
    department,
    tools,
    skills,
    mind
  }

  // Generate SDK config
  const sdkConfig = generateAgentSDKConfig(fullAgent)

  return NextResponse.json({
    agent: fullAgent,
    sdkConfig
  })
}

// PATCH /api/workspaces/[wid]/agents/[id] - Update workspace agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ wid: string; id: string }> }
) {
  const { wid, id } = await params
  const { error } = await requireWorkspaceAdmin(wid)
  if (error) return error

  const supabase = createAdminClient()

  // Verify agent belongs to this workspace and is not a system template
  const { data: existingAgent } = await supabase
    .from('ai_agents')
    .select('id, is_system, workspace_id')
    .eq('id', id)
    .single()

  if (!existingAgent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (existingAgent.is_system) {
    return NextResponse.json({ error: 'Cannot modify system templates' }, { status: 403 })
  }

  if (existingAgent.workspace_id !== wid) {
    return NextResponse.json({ error: 'Agent not found in this workspace' }, { status: 404 })
  }

  const body = await request.json()

  const allowedFields = [
    'name', 'description', 'department_id', 'avatar_url', 'model',
    'system_prompt', 'permission_mode', 'max_turns', 'is_enabled',
    'is_head', 'config'
  ]
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (updates.model && !['sonnet', 'opus', 'haiku'].includes(updates.model as string)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
  }

  if (updates.permission_mode && !['default', 'acceptEdits', 'bypassPermissions'].includes(updates.permission_mode as string)) {
    return NextResponse.json({ error: 'Invalid permission_mode' }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', wid) // Ensure we only update workspace agents
    .select()
    .single()

  if (dbError) {
    console.error('Update workspace agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ agent: data })
}

// DELETE /api/workspaces/[wid]/agents/[id] - Delete workspace agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wid: string; id: string }> }
) {
  const { wid, id } = await params
  const { error } = await requireWorkspaceAdmin(wid)
  if (error) return error

  const supabase = createAdminClient()

  // Verify agent belongs to this workspace and is not a system template
  const { data: existingAgent } = await supabase
    .from('ai_agents')
    .select('id, name, is_system, workspace_id')
    .eq('id', id)
    .single()

  if (!existingAgent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (existingAgent.is_system) {
    return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 })
  }

  if (existingAgent.workspace_id !== wid) {
    return NextResponse.json({ error: 'Agent not found in this workspace' }, { status: 404 })
  }

  const { error: dbError } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', id)
    .eq('workspace_id', wid) // Ensure we only delete workspace agents

  if (dbError) {
    console.error('Delete workspace agent error:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
