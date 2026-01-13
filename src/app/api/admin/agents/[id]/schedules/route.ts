import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNextRunTime, isValidCron } from '@/lib/cron-utils'

// GET /api/admin/agents/[id]/schedules - List schedules for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { id: agentId } = await params
    const supabase = createAdminClient()

    const { data: schedules, error: dbError } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('Fetch schedules error:', dbError)
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

// POST /api/admin/agents/[id]/schedules - Create a new schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: agentId } = await params
    const body = await request.json()

    const {
      name,
      description,
      cron_expression,
      timezone = 'UTC',
      task_prompt,
      requires_approval = false,
      output_config = {}
    } = body

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!cron_expression || !isValidCron(cron_expression)) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
    }

    if (!task_prompt || task_prompt.trim() === '') {
      return NextResponse.json({ error: 'task_prompt is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id, name')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Calculate next run time
    const nextRunAt = getNextRunTime(cron_expression, timezone)

    // Create schedule
    const { data: schedule, error: dbError } = await supabase
      .from('agent_schedules')
      .insert({
        agent_id: agentId,
        name,
        description: description || null,
        cron_expression,
        timezone,
        task_prompt,
        requires_approval,
        output_config,
        is_enabled: true,
        next_run_at: nextRunAt.toISOString(),
        created_by: user!.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Create schedule error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'schedule_created',
      'agent_schedule',
      schedule.id,
      { agent_id: agentId, name, cron_expression },
      request
    )

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (err) {
    console.error('Schedule POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
