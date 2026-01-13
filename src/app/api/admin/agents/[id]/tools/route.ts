import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/tools - Get agent's tool assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error: dbError } = await supabase
    .from('ai_agent_tools')
    .select(`
      tool_id,
      config,
      tool:agent_tools(id, name, description, category, input_schema, is_builtin, is_enabled)
    `)
    .eq('agent_id', id)

  if (dbError) {
    console.error('Fetch agent tools error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
  }

  return NextResponse.json({ tools: data || [] })
}

// PUT /api/admin/agents/[id]/tools - Replace agent's tool assignments
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { tool_ids, configs } = body as {
    tool_ids: string[]
    configs?: Record<string, Record<string, unknown>>
  }

  if (!Array.isArray(tool_ids)) {
    return NextResponse.json({ error: 'tool_ids must be an array' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify agent exists
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Delete existing assignments
  await supabase
    .from('ai_agent_tools')
    .delete()
    .eq('agent_id', id)

  // Insert new assignments
  if (tool_ids.length > 0) {
    const assignments = tool_ids.map(tool_id => ({
      agent_id: id,
      tool_id,
      config: configs?.[tool_id] || {}
    }))

    const { error: insertError } = await supabase
      .from('ai_agent_tools')
      .insert(assignments)

    if (insertError) {
      console.error('Insert agent tools error:', insertError)
      return NextResponse.json({ error: 'Failed to assign tools' }, { status: 500 })
    }
  }

  await logAdminAction(
    user!.id,
    'agent_tools_updated',
    'ai_agent',
    id,
    { tool_ids, tool_count: tool_ids.length },
    request
  )

  // Fetch updated assignments
  const { data: updatedTools } = await supabase
    .from('ai_agent_tools')
    .select(`
      tool_id,
      config,
      tool:agent_tools(id, name, description, category, input_schema, is_builtin, is_enabled)
    `)
    .eq('agent_id', id)

  return NextResponse.json({ tools: updatedTools || [] })
}
