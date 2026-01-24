import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/schedules - List all schedules with agent info
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const enabledOnly = searchParams.get('enabled') === 'true'
    const agentId = searchParams.get('agent_id')

    let query = supabase
      .from('agent_schedules')
      .select(`
        id,
        name,
        description,
        agent_id,
        cron_expression,
        timezone,
        task_prompt,
        is_enabled,
        requires_approval,
        next_run_at,
        last_run_at,
        created_at,
        agent:ai_agents(id, name, is_enabled, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (enabledOnly) {
      query = query.eq('is_enabled', true)
    }

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data: schedules, error: dbError } = await query

    if (dbError) {
      console.error('Fetch all schedules error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ schedules: schedules || [] })
  } catch (err) {
    console.error('Schedules GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
