import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin, logAdminAction } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/scheduled-tasks/[executionId]/reject - Reject a pending execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { error, user } = await requireSuperadmin()
    if (error) return error

    const { executionId } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    const supabase = createAdminClient()

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('agent_schedule_executions')
      .select('*, schedule:agent_schedules(id, name)')
      .eq('id', executionId)
      .single()

    if (execError || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    if (execution.status !== 'pending_approval') {
      return NextResponse.json(
        { error: `Cannot reject execution with status: ${execution.status}` },
        { status: 400 }
      )
    }

    // Update to rejected
    const { data: updatedExecution, error: updateError } = await supabase
      .from('agent_schedule_executions')
      .update({
        status: 'rejected',
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null
      })
      .eq('id', executionId)
      .select()
      .single()

    if (updateError) {
      console.error('Reject execution error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await logAdminAction(
      user!.id,
      'schedule_execution_rejected',
      'agent_schedule_execution',
      executionId,
      { schedule_id: execution.schedule_id, reason },
      request
    )

    return NextResponse.json({
      execution: updatedExecution,
      message: 'Execution rejected'
    })
  } catch (err) {
    console.error('Reject execution error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
