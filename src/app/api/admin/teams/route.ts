import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/teams - List all teams
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const includeAgents = searchParams.get('include_agents') === 'true'
    const activeOnly = searchParams.get('active_only') === 'true'

    const supabase = createAdminClient()

    let query = supabase
      .from('teams')
      .select(`
        *,
        head_agent:ai_agents!teams_head_agent_id_fkey(id, name, avatar_url)
      `)
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: teams, error: dbError } = await query

    if (dbError) {
      console.error('Teams query error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Get agent counts for each team
    const { data: agentCounts } = await supabase
      .from('team_agents')
      .select('team_id')

    const countMap = (agentCounts || []).reduce((acc: Record<string, number>, row) => {
      acc[row.team_id] = (acc[row.team_id] || 0) + 1
      return acc
    }, {})

    const teamsWithCounts = (teams || []).map(team => ({
      ...team,
      agent_count: countMap[team.id] || 0
    }))

    return NextResponse.json({ teams: teamsWithCounts })
  } catch (err) {
    console.error('Teams GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const body = await request.json()
    const { name, slug, description, is_active = true } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data, error: dbError } = await supabase
      .from('teams')
      .insert({
        name,
        slug: finalSlug,
        description: description || null,
        is_active
      })
      .select()
      .single()

    if (dbError) {
      console.error('Create team error:', dbError)
      if (dbError.code === '23505') {
        return NextResponse.json({ error: 'A team with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'team_created',
      'team',
      data.id,
      { name, slug: finalSlug },
      request
    )

    return NextResponse.json({ team: data }, { status: 201 })
  } catch (err) {
    console.error('Teams POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
