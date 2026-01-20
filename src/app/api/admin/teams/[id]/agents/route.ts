import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PUT /api/admin/teams/[id]/agents - Set team agents (replaces all)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const { agents } = body

    if (!Array.isArray(agents)) {
      return NextResponse.json({ error: 'agents must be an array' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', id)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Delete existing team agents
    await supabase
      .from('team_agents')
      .delete()
      .eq('team_id', id)

    // Insert new team agents
    if (agents.length > 0) {
      const teamAgents = agents.map((agent: { agent_id: string; role?: string; display_order?: number }, index: number) => ({
        team_id: id,
        agent_id: agent.agent_id,
        role: agent.role || 'member',
        display_order: agent.display_order ?? index
      }))

      const { error: insertError } = await supabase
        .from('team_agents')
        .insert(teamAgents)

      if (insertError) {
        console.error('Insert team agents error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Update head_agent_id if there's a head agent
    const headAgent = agents.find((a: { role?: string }) => a.role === 'head')
    if (headAgent) {
      await supabase
        .from('teams')
        .update({ head_agent_id: headAgent.agent_id })
        .eq('id', id)
    } else if (agents.length === 0) {
      await supabase
        .from('teams')
        .update({ head_agent_id: null })
        .eq('id', id)
    }

    await logAdminAction(
      user!.id,
      'team_agents_updated',
      'team',
      id,
      { agent_count: agents.length },
      request
    )

    // Return updated team agents
    const { data: updatedAgents } = await supabase
      .from('team_agents')
      .select(`
        *,
        agent:ai_agents(id, name, description, avatar_url, model, is_enabled)
      `)
      .eq('team_id', id)
      .order('display_order', { ascending: true })

    return NextResponse.json({ agents: updatedAgents || [] })
  } catch (err) {
    console.error('Team agents PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/teams/[id]/agents - Get team agents
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: agents, error: dbError } = await supabase
      .from('team_agents')
      .select(`
        *,
        agent:ai_agents(id, name, description, avatar_url, model, is_enabled)
      `)
      .eq('team_id', id)
      .order('display_order', { ascending: true })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ agents: agents || [] })
  } catch (err) {
    console.error('Team agents GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
