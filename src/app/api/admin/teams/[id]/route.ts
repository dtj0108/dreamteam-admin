import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/teams/[id] - Get team with agents and delegations
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    // Get team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        *,
        head_agent:ai_agents!teams_head_agent_id_fkey(id, name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (teamError) {
      if (teamError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      return NextResponse.json({ error: teamError.message }, { status: 500 })
    }

    // Get team agents with agent details
    const { data: teamAgents } = await supabase
      .from('team_agents')
      .select(`
        *,
        agent:ai_agents(id, name, description, avatar_url, model, is_enabled)
      `)
      .eq('team_id', id)
      .order('display_order', { ascending: true })

    // Get team delegations
    const { data: delegations } = await supabase
      .from('team_delegations')
      .select(`
        *,
        from_agent:ai_agents!team_delegations_from_agent_id_fkey(id, name, avatar_url),
        to_agent:ai_agents!team_delegations_to_agent_id_fkey(id, name, avatar_url)
      `)
      .eq('team_id', id)

    // Get plans that use this team
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name, slug')
      .eq('team_id', id)

    // Get team mind files via junction table
    const { data: teamMind } = await supabase
      .from('team_mind')
      .select(`
        *,
        mind:agent_mind(*)
      `)
      .eq('team_id', id)
      .order('position_override', { ascending: true, nullsFirst: false })

    return NextResponse.json({
      team: {
        ...team,
        agents: teamAgents || [],
        delegations: delegations || [],
        plans: plans || [],
        mind: teamMind || [],
        mind_count: teamMind?.length || 0
      }
    })
  } catch (err) {
    console.error('Team GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/teams/[id] - Update team
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const { name, slug, description, head_agent_id, is_active } = body

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (description !== undefined) updates.description = description
    if (head_agent_id !== undefined) updates.head_agent_id = head_agent_id
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error: dbError } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      if (dbError.code === '23505') {
        return NextResponse.json({ error: 'A team with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'team_updated',
      'team',
      id,
      updates,
      request
    )

    return NextResponse.json({ team: data })
  } catch (err) {
    console.error('Team PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/teams/[id] - Delete team
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    // Check if any plans use this team
    const { data: plans } = await supabase
      .from('plans')
      .select('id, name')
      .eq('team_id', id)

    if (plans && plans.length > 0) {
      return NextResponse.json({
        error: `Cannot delete team: ${plans.length} plan(s) reference this team`,
        plans: plans.map(p => p.name)
      }, { status: 400 })
    }

    const { error: dbError } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'team_deleted',
      'team',
      id,
      {},
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Team DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
