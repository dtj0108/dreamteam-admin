import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runScheduledExecution, ScheduledExecutionContext } from '@/lib/agent-runtime'

// POST /api/admin/agents/[id]/schedules/[scheduleId]/run - Manually trigger a schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { id: agentId, scheduleId } = await params
    const body = await request.json().catch(() => ({}))
    const workspaceId = body.workspace_id as string | undefined
    const supabase = createAdminClient()

    // Get schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('agent_schedules')
      .select('*, agent:ai_agents(id, name, model, system_prompt)')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('agent_schedule_executions')
      .insert({
        schedule_id: scheduleId,
        agent_id: agentId,
        scheduled_for: new Date().toISOString(),
        status: schedule.requires_approval ? 'pending_approval' : 'running',
        started_at: schedule.requires_approval ? null : new Date().toISOString()
      })
      .select()
      .single()

    if (execError) {
      console.error('Create execution error:', execError)
      return NextResponse.json({ error: execError.message }, { status: 500 })
    }

    // If requires approval, just return the pending execution
    if (schedule.requires_approval) {
      await logAdminAction(
        user!.id,
        'schedule_run_pending',
        'agent_schedule_execution',
        execution.id,
        { schedule_id: scheduleId, schedule_name: schedule.name },
        request
      )

      return NextResponse.json({
        execution,
        message: 'Execution created and pending approval'
      }, { status: 201 })
    }

    // Otherwise, execute immediately
    // For now, we'll mark it as running and let the actual execution happen asynchronously
    // In a full implementation, this would invoke the Claude Agent SDK

    await logAdminAction(
      user!.id,
      'schedule_run_started',
      'agent_schedule_execution',
      execution.id,
      { schedule_id: scheduleId, schedule_name: schedule.name },
      request
    )

    // Run the agent using the agent runtime
    try {
      // Build workspace context if provided
      let context: ScheduledExecutionContext | undefined
      if (workspaceId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single()

        context = {
          workspaceId,
          workspaceName: workspace?.name,
        }
      }

      const result = await runScheduledExecution(
        execution.id,
        agentId,
        schedule.task_prompt,
        context
      )

      // Update schedule's last_run_at
      await supabase
        .from('agent_schedules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', scheduleId)

      // Fetch the updated execution with tokens from DB
      const { data: updatedExecution } = await supabase
        .from('agent_schedule_executions')
        .select('*')
        .eq('id', execution.id)
        .single()

      return NextResponse.json({
        execution: updatedExecution || {
          ...execution,
          status: result.success ? 'completed' : 'failed',
          result: { message: result.result, todos: result.todos },
          error_message: result.error || null,
        },
        message: result.success ? 'Execution completed' : 'Execution failed',
        error: result.error,
        usage: result.usage,
      }, { status: 201 })
    } catch (execError) {
      console.error('Agent execution error:', execError)
      return NextResponse.json({
        execution: { ...execution, status: 'failed' },
        message: 'Execution failed',
        error: execError instanceof Error ? execError.message : 'Unknown error',
      }, { status: 500 })
    }
  } catch (err) {
    console.error('Schedule run error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
