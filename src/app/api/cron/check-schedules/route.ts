import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNextRunTime } from '@/lib/cron-utils'
import { runScheduledExecution } from '@/lib/agent-runtime'

/**
 * Vercel Cron endpoint - called periodically to check for due schedules
 *
 * Security: This endpoint is protected by Vercel's cron authentication
 * In production, verify the CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()

    // Find schedules that are due to run
    const { data: dueSchedules, error: queryError } = await supabase
      .from('agent_schedules')
      .select(`
        *,
        agent:ai_agents(id, name, model, system_prompt, is_enabled)
      `)
      .eq('is_enabled', true)
      .lte('next_run_at', now.toISOString())

    if (queryError) {
      console.error('Query schedules error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({
        message: 'No schedules due',
        checked_at: now.toISOString(),
        count: 0
      })
    }

    const results: Array<{
      schedule_id: string
      schedule_name: string
      status: string
      execution_id?: string
      error?: string
    }> = []

    // Process each due schedule
    for (const schedule of dueSchedules) {
      try {
        // Skip if agent is disabled
        if (!schedule.agent?.is_enabled) {
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'skipped',
            error: 'Agent is disabled'
          })
          continue
        }

        // Create execution record
        const executionStatus = schedule.requires_approval ? 'pending_approval' : 'running'

        const { data: execution, error: execError } = await supabase
          .from('agent_schedule_executions')
          .insert({
            schedule_id: schedule.id,
            agent_id: schedule.agent_id,
            scheduled_for: schedule.next_run_at,
            status: executionStatus,
            started_at: schedule.requires_approval ? null : now.toISOString()
          })
          .select()
          .single()

        if (execError) {
          console.error(`Create execution error for schedule ${schedule.id}:`, execError)
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'error',
            error: execError.message
          })
          continue
        }

        // Calculate next run time
        const nextRunAt = getNextRunTime(schedule.cron_expression, schedule.timezone, now)

        // Update schedule with last_run_at and new next_run_at
        await supabase
          .from('agent_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString()
          })
          .eq('id', schedule.id)

        if (schedule.requires_approval) {
          // Just created pending execution, will be processed when approved
          results.push({
            schedule_id: schedule.id,
            schedule_name: schedule.name,
            status: 'pending_approval',
            execution_id: execution.id
          })
        } else {
          // Execute immediately using the agent runtime
          try {
            const agentResult = await runScheduledExecution(
              execution.id,
              schedule.agent_id,
              schedule.task_prompt
            )

            results.push({
              schedule_id: schedule.id,
              schedule_name: schedule.name,
              status: agentResult.success ? 'completed' : 'failed',
              execution_id: execution.id
            })
          } catch (execError) {
            console.error(`Agent execution error for schedule ${schedule.id}:`, execError)
            results.push({
              schedule_id: schedule.id,
              schedule_name: schedule.name,
              status: 'failed',
              execution_id: execution.id,
              error: execError instanceof Error ? execError.message : 'Execution failed'
            })
          }
        }
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.id}:`, scheduleError)
        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          status: 'error',
          error: scheduleError instanceof Error ? scheduleError.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Schedules processed',
      checked_at: now.toISOString(),
      count: dueSchedules.length,
      results
    })
  } catch (err) {
    console.error('Cron check-schedules error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export { GET as POST }
