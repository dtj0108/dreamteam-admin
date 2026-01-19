import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/mind - Get agent's mind assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  const { data: assignments, error: assignError } = await supabase
    .from('ai_agent_mind')
    .select('mind_id, position_override')
    .eq('agent_id', id)

  if (assignError) {
    console.error('Fetch agent mind error:', assignError)
    return NextResponse.json({ error: 'Failed to fetch mind' }, { status: 500 })
  }

  let mind: unknown[] = []
  if (assignments && assignments.length > 0) {
    const mindIds = assignments.map(a => a.mind_id)
    const { data: mindData } = await supabase
      .from('agent_mind')
      .select('id, name, slug, description, category, content, content_type, position, is_enabled')
      .in('id', mindIds)

    mind = assignments.map(a => ({
      agent_id: id,
      mind_id: a.mind_id,
      position_override: a.position_override,
      mind: mindData?.find(m => m.id === a.mind_id)
    }))
  }

  return NextResponse.json({ mind })
}

// PUT /api/admin/agents/[id]/mind - Replace agent's mind assignments
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { mind_ids } = body as { mind_ids: string[] }

  if (!Array.isArray(mind_ids)) {
    return NextResponse.json({ error: 'mind_ids must be an array' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: agent } = await supabase
    .from('ai_agents')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  await supabase
    .from('ai_agent_mind')
    .delete()
    .eq('agent_id', id)

  if (mind_ids.length > 0) {
    const assignments = mind_ids.map(mind_id => ({
      agent_id: id,
      mind_id
    }))

    const { error: insertError } = await supabase
      .from('ai_agent_mind')
      .insert(assignments)

    if (insertError) {
      console.error('Insert agent mind error:', insertError)
      return NextResponse.json({ error: 'Failed to assign mind' }, { status: 500 })
    }
  }

  await logAdminAction(
    user!.id,
    'agent_mind_updated',
    'ai_agent',
    id,
    { mind_ids, mind_count: mind_ids.length },
    request
  )

  const { data: assignments } = await supabase
    .from('ai_agent_mind')
    .select('mind_id, position_override')
    .eq('agent_id', id)

  let mind: unknown[] = []
  if (assignments && assignments.length > 0) {
    const mindIds = assignments.map(a => a.mind_id)
    const { data: mindData } = await supabase
      .from('agent_mind')
      .select('id, name, slug, description, category, content, content_type, position, is_enabled')
      .in('id', mindIds)

    mind = assignments.map(a => ({
      agent_id: id,
      mind_id: a.mind_id,
      position_override: a.position_override,
      mind: mindData?.find(m => m.id === a.mind_id)
    }))
  }

  return NextResponse.json({ mind })
}

