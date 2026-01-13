import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/agents/[id]/team - Get agent's delegations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const supabase = createAdminClient()

  // Get delegations FROM this agent (who can it call)
  const { data: delegatesTo, error: delegatesToError } = await supabase
    .from('agent_delegations')
    .select(`
      id,
      to_agent_id,
      condition,
      context_template,
      created_at,
      to_agent:ai_agents!to_agent_id(id, name, avatar_url, department_id)
    `)
    .eq('from_agent_id', id)

  if (delegatesToError) {
    console.error('Fetch delegations error:', delegatesToError)
    return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 })
  }

  // Get delegations TO this agent (who can call it)
  const { data: delegatedBy, error: delegatedByError } = await supabase
    .from('agent_delegations')
    .select(`
      id,
      from_agent_id,
      condition,
      context_template,
      created_at,
      from_agent:ai_agents!from_agent_id(id, name, avatar_url, department_id)
    `)
    .eq('to_agent_id', id)

  if (delegatedByError) {
    console.error('Fetch delegated by error:', delegatedByError)
    return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 })
  }

  return NextResponse.json({
    delegatesTo: delegatesTo || [],
    delegatedBy: delegatedBy || []
  })
}

// PUT /api/admin/agents/[id]/team - Replace agent's delegations
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperadmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { delegations } = body as {
    delegations: {
      to_agent_id: string
      condition?: string
      context_template?: string
    }[]
  }

  if (!Array.isArray(delegations)) {
    return NextResponse.json({ error: 'delegations must be an array' }, { status: 400 })
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

  // Validate no self-delegation
  for (const delegation of delegations) {
    if (delegation.to_agent_id === id) {
      return NextResponse.json({ error: 'An agent cannot delegate to itself' }, { status: 400 })
    }
  }

  // Delete existing delegations FROM this agent
  await supabase
    .from('agent_delegations')
    .delete()
    .eq('from_agent_id', id)

  // Insert new delegations
  if (delegations.length > 0) {
    const inserts = delegations.map(d => ({
      from_agent_id: id,
      to_agent_id: d.to_agent_id,
      condition: d.condition || null,
      context_template: d.context_template || null
    }))

    const { error: insertError } = await supabase
      .from('agent_delegations')
      .insert(inserts)

    if (insertError) {
      console.error('Insert delegations error:', insertError)
      return NextResponse.json({ error: 'Failed to save delegations' }, { status: 500 })
    }
  }

  await logAdminAction(
    user!.id,
    'agent_delegations_updated',
    'ai_agent',
    id,
    { delegation_count: delegations.length },
    request
  )

  // Fetch updated delegations
  const { data: updatedDelegations } = await supabase
    .from('agent_delegations')
    .select(`
      id,
      to_agent_id,
      condition,
      context_template,
      created_at,
      to_agent:ai_agents!to_agent_id(id, name, avatar_url, department_id)
    `)
    .eq('from_agent_id', id)

  return NextResponse.json({ delegations: updatedDelegations || [] })
}
