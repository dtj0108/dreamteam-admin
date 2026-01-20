import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/admin/plans/[id] - Get plan with team
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    const { data: plan, error: dbError } = await supabase
      .from('plans')
      .select(`
        *,
        team:teams(
          id,
          name,
          slug,
          description,
          is_active,
          head_agent:ai_agents!teams_head_agent_id_fkey(id, name, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ plan })
  } catch (err) {
    console.error('Plan GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/plans/[id] - Update plan
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const body = await request.json()
    const {
      name,
      slug,
      description,
      team_id,
      price_monthly,
      price_yearly,
      features,
      limits,
      is_active
    } = body

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (description !== undefined) updates.description = description
    if (team_id !== undefined) updates.team_id = team_id
    if (price_monthly !== undefined) updates.price_monthly = price_monthly
    if (price_yearly !== undefined) updates.price_yearly = price_yearly
    if (features !== undefined) updates.features = features
    if (limits !== undefined) updates.limits = limits
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error: dbError } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        team:teams(id, name, slug)
      `)
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
      if (dbError.code === '23505') {
        return NextResponse.json({ error: 'A plan with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'plan_updated',
      'plan',
      id,
      updates,
      request
    )

    return NextResponse.json({ plan: data })
  } catch (err) {
    console.error('Plan PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/plans/[id] - Delete plan
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id } = await context.params
    const supabase = createAdminClient()

    // Check if any workspaces use this plan
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('plan_id', id)

    if (workspaces && workspaces.length > 0) {
      return NextResponse.json({
        error: `Cannot delete plan: ${workspaces.length} workspace(s) use this plan`,
        workspaces: workspaces.map(w => w.name)
      }, { status: 400 })
    }

    const { error: dbError } = await supabase
      .from('plans')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'plan_deleted',
      'plan',
      id,
      {},
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Plan DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
