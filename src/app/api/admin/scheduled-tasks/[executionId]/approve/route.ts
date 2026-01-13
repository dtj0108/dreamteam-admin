import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/scheduled-tasks/[executionId]/approve - Approve and run a pending execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { executionId } = await params
    const supabase = createAdminClient()
    const now = new Date()

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('agent_schedule_executions')
      .select(`
        *,
        schedule:agent_schedules(id, name, task_prompt),
        agent:ai_agents(id, name, model, system_prompt, is_enabled)
      `)
      .eq('id', executionId)
      .single()

    if (execError || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    if (execution.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot approve execution with status: ${execution.status}` },
        { status: 400 }
      )
    }

    // Check if agent is enabled
    if (!execution.agent?.is_enabled) {
      return NextResponse.json(
        { error: 'Cannot approve: Agent is disabled' },
        { status: 400 }
      )
    }

    // Update to approved/running
    const { data: updatedExecution, error: updateError } = await supabase
      .from('agent_schedule_executions')
      .update({
        status: 'running',
        approved_by: user!.id,
        approved_at: now.toISOString(),
        started_at: now.toISOString()
      })
      .eq('id', executionId)
      .select()
      .single()

    if (updateError) {
      console.error('Approve execution error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // TODO: Actually invoke the agent here
    // For now, simulate completion

    await supabase
      .from('agent_schedule_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: {
          message: 'Approved execution completed (placeholder)',
          task_prompt: execution.schedule?.task_prompt
        },
        duration_ms: 100
      })
      .eq('id', executionId)

    await logAdminAction(
      user!.id,
      'schedule_execution_approved',
      'agent_schedule_execution',
      executionId,
      { schedule_id: execution.schedule_id, agent_id: execution.agent_id },
      request
    )

    return NextResponse.json({
      execution: { ...updatedExecution, status: 'completed' },
      message: 'Execution approved and completed'
    })
  } catch (err) {
    console.error('Approve execution error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
