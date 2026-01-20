import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/teams/[id]/deployments - List all deployments of this team
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id: teamId } = await context.params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'active', 'paused', 'replaced', or all if not specified
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createAdminClient()

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, slug, current_version')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('workspace_deployed_teams')
      .select(`
        *,
        workspace:workspaces(id, name),
        deployed_by_profile:profiles!workspace_deployed_teams_deployed_by_fkey(id, email, full_name)
      `, { count: 'exact' })
      .eq('source_team_id', teamId)
      .order('deployed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: deployments, error: queryError, count } = await query

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Count active deployments
    const { count: activeCount } = await supabase
      .from('workspace_deployed_teams')
      .select('id', { count: 'exact', head: true })
      .eq('source_team_id', teamId)
      .eq('status', 'active')

    // Count outdated deployments (version < current)
    const { data: outdated } = await supabase
      .from('workspace_deployed_teams')
      .select('id')
      .eq('source_team_id', teamId)
      .eq('status', 'active')
      .lt('source_version', team.current_version)

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        current_version: team.current_version,
      },
      deployments: deployments || [],
      total: count || 0,
      active_count: activeCount || 0,
      outdated_count: outdated?.length || 0,
    })
  } catch (err) {
    console.error('Team deployments GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
