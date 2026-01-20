import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PUT /api/admin/teams/[id]/delegations - Set team delegations (replaces all)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const { delegations } = body

    if (!Array.isArray(delegations)) {
      return NextResponse.json({ error: 'delegations must be an array' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify team exists and get team agents
    const { data: teamAgents, error: teamError } = await supabase
      .from('team_agents')
      .select('agent_id')
      .eq('team_id', id)

    if (teamError) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const teamAgentIds = new Set((teamAgents || []).map(ta => ta.agent_id))

    // Validate that all delegations are between agents in this team
    for (const delegation of delegations) {
      if (!teamAgentIds.has(delegation.from_agent_id)) {
        return NextResponse.json({
          error: `from_agent_id ${delegation.from_agent_id} is not a member of this team`
        }, { status: 400 })
      }
      if (!teamAgentIds.has(delegation.to_agent_id)) {
        return NextResponse.json({
          error: `to_agent_id ${delegation.to_agent_id} is not a member of this team`
        }, { status: 400 })
      }
      if (delegation.from_agent_id === delegation.to_agent_id) {
        return NextResponse.json({
          error: 'An agent cannot delegate to itself'
        }, { status: 400 })
      }
    }

    // Delete existing delegations
    await supabase
      .from('team_delegations')
      .delete()
      .eq('team_id', id)

    // Insert new delegations
    if (delegations.length > 0) {
      const teamDelegations = delegations.map((d: {
        from_agent_id: string
        to_agent_id: string
        condition?: string
        context_template?: string
      }) => ({
        team_id: id,
        from_agent_id: d.from_agent_id,
        to_agent_id: d.to_agent_id,
        condition: d.condition || null,
        context_template: d.context_template || null
      }))

      const { error: insertError } = await supabase
        .from('team_delegations')
        .insert(teamDelegations)

      if (insertError) {
        console.error('Insert team delegations error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    await logAdminAction(
      user!.id,
      'team_delegations_updated',
      'team',
      id,
      { delegation_count: delegations.length },
      request
    )

    // Return updated delegations
    const { data: updatedDelegations } = await supabase
      .from('team_delegations')
      .select(`
        *,
        from_agent:ai_agents!team_delegations_from_agent_id_fkey(id, name, avatar_url),
        to_agent:ai_agents!team_delegations_to_agent_id_fkey(id, name, avatar_url)
      `)
      .eq('team_id', id)

    return NextResponse.json({ delegations: updatedDelegations || [] })
  } catch (err) {
    console.error('Team delegations PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/teams/[id]/delegations - Get team delegations
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: delegations, error: dbError } = await supabase
      .from('team_delegations')
      .select(`
        *,
        from_agent:ai_agents!team_delegations_from_agent_id_fkey(id, name, avatar_url),
        to_agent:ai_agents!team_delegations_to_agent_id_fkey(id, name, avatar_url)
      `)
      .eq('team_id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ delegations: delegations || [] })
  } catch (err) {
    console.error('Team delegations GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
