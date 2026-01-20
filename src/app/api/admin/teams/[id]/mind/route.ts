import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/teams/[id]/mind - List mind files for a team
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
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

    // Get team's mind files via junction table
    const { data: teamMind, error: mindError } = await supabase
      .from('team_mind')
      .select(`
        *,
        mind:agent_mind(*)
      `)
      .eq('team_id', id)
      .order('position_override', { ascending: true, nullsFirst: false })

    if (mindError) {
      console.error('Team mind query error:', mindError)
      return NextResponse.json({ error: 'Failed to fetch team mind' }, { status: 500 })
    }

    return NextResponse.json({ mind: teamMind || [] })
  } catch (err) {
    console.error('Team mind GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/teams/[id]/mind - Replace team's mind assignments
// Body: { mind_ids: string[] }
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const { mind_ids } = body

    if (!Array.isArray(mind_ids)) {
      return NextResponse.json({ error: 'mind_ids must be an array' }, { status: 400 })
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

    // Verify all mind_ids exist
    if (mind_ids.length > 0) {
      const { data: existingMind } = await supabase
        .from('agent_mind')
        .select('id')
        .in('id', mind_ids)

      if (!existingMind || existingMind.length !== mind_ids.length) {
        return NextResponse.json({ error: 'One or more mind files not found' }, { status: 400 })
      }
    }

    // Delete existing assignments
    await supabase.from('team_mind').delete().eq('team_id', id)

    // Insert new assignments
    if (mind_ids.length > 0) {
      const assignments = mind_ids.map((mind_id: string, index: number) => ({
        team_id: id,
        mind_id,
        position_override: index
      }))

      const { error: insertError } = await supabase
        .from('team_mind')
        .insert(assignments)

      if (insertError) {
        console.error('Team mind insert error:', insertError)
        return NextResponse.json({ error: 'Failed to assign mind files' }, { status: 500 })
      }
    }

    await logAdminAction(
      user!.id,
      'team_mind_updated',
      'team',
      id,
      { mind_ids },
      request
    )

    // Return updated mind assignments
    const { data: updatedMind } = await supabase
      .from('team_mind')
      .select(`
        *,
        mind:agent_mind(*)
      `)
      .eq('team_id', id)
      .order('position_override', { ascending: true })

    return NextResponse.json({ mind: updatedMind || [] })
  } catch (err) {
    console.error('Team mind PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/teams/[id]/mind - Create new mind file directly for team
// This creates a new mind file and assigns it to the team
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const {
      name,
      slug,
      description,
      category,
      content,
      content_type = 'general',
      position = 0,
      is_enabled = true,
      scope = 'agent'
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const validCategories = ['finance', 'crm', 'team', 'projects', 'knowledge', 'communications', 'goals', 'shared']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const validContentTypes = ['responsibilities', 'workflows', 'policies', 'metrics', 'examples', 'general']
    if (!validContentTypes.includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    const validScopes = ['agent', 'department', 'company']
    if (!validScopes.includes(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
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

    // Create mind file with team_id set
    const { data: mindFile, error: mindError } = await supabase
      .from('agent_mind')
      .insert({
        name,
        slug: slug || null,
        description: description || null,
        category,
        content,
        content_type,
        position,
        is_enabled,
        is_system: true,
        workspace_id: null,
        team_id: id,
        scope,
        department_id: null
      })
      .select()
      .single()

    if (mindError) {
      if (mindError.code === '23505') {
        return NextResponse.json({ error: 'A mind file with this slug already exists' }, { status: 400 })
      }
      console.error('Create mind error:', mindError)
      return NextResponse.json({ error: mindError.message }, { status: 500 })
    }

    // Also add to team_mind junction table
    await supabase
      .from('team_mind')
      .insert({
        team_id: id,
        mind_id: mindFile.id,
        position_override: position
      })

    await logAdminAction(
      user!.id,
      'team_mind_created',
      'agent_mind',
      mindFile.id,
      { team_id: id, name, category, content_type },
      request
    )

    return NextResponse.json({ mind: mindFile }, { status: 201 })
  } catch (err) {
    console.error('Team mind POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/teams/[id]/mind - Remove mind assignment from team
// Query param: mind_id
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const mindId = searchParams.get('mind_id')

    if (!mindId) {
      return NextResponse.json({ error: 'mind_id query parameter is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Remove from junction table
    const { error: deleteError } = await supabase
      .from('team_mind')
      .delete()
      .eq('team_id', id)
      .eq('mind_id', mindId)

    if (deleteError) {
      console.error('Team mind delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove mind assignment' }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'team_mind_removed',
      'team',
      id,
      { mind_id: mindId },
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Team mind DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
