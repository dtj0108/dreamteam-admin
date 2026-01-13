import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNextRunTime, isValidCron } from '@/lib/cron-utils'

// GET /api/admin/agents/[id]/schedules/[scheduleId] - Get single schedule with executions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const { scheduleId } = await params
    const supabase = createAdminClient()

    // Get schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('agent_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Get recent executions
    const { data: executions } = await supabase
      .from('agent_schedule_executions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      schedule,
      executions: executions || []
    })
  } catch (err) {
    console.error('Schedule GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/agents/[id]/schedules/[scheduleId] - Update schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { scheduleId } = await params
    const body = await request.json()

    const allowedFields = [
      'name', 'description', 'cron_expression', 'timezone',
      'task_prompt', 'requires_approval', 'output_config', 'is_enabled'
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Validate cron if being updated
    if (updates.cron_expression && !isValidCron(updates.cron_expression as string)) {
      return NextResponse.json({ error: 'Invalid cron expression' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get current schedule to recalculate next_run_at if needed
    const { data: currentSchedule } = await supabase
      .from('agent_schedules')
      .select('cron_expression, timezone')
      .eq('id', scheduleId)
      .single()

    // Recalculate next_run_at if cron or timezone changed
    if (updates.cron_expression || updates.timezone) {
      const cron = (updates.cron_expression || currentSchedule?.cron_expression) as string
      const tz = (updates.timezone || currentSchedule?.timezone) as string
      updates.next_run_at = getNextRunTime(cron, tz).toISOString()
    }

    const { data: schedule, error: dbError } = await supabase
      .from('agent_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single()

    if (dbError) {
      console.error('Update schedule error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    await logAdminAction(
      user!.id,
      'schedule_updated',
      'agent_schedule',
      scheduleId,
      updates,
      request
    )

    return NextResponse.json({ schedule })
  } catch (err) {
    console.error('Schedule PATCH error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/agents/[id]/schedules/[scheduleId] - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { scheduleId } = await params
    const supabase = createAdminClient()

    // Get schedule name before deletion
    const { data: schedule } = await supabase
      .from('agent_schedules')
      .select('name, agent_id')
      .eq('id', scheduleId)
      .single()

    const { error: dbError } = await supabase
      .from('agent_schedules')
      .delete()
      .eq('id', scheduleId)

    if (dbError) {
      console.error('Delete schedule error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'schedule_deleted',
      'agent_schedule',
      scheduleId,
      { name: schedule?.name, agent_id: schedule?.agent_id },
      request
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Schedule DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
