import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendScheduledTaskNotification } from '@/lib/agent-messaging'

/**
 * POST /api/admin/scheduled-tasks/test-notification
 *
 * Test the notification system without running an agent.
 * This simulates a completed/failed execution and sends the notification.
 *
 * Body:
 * - schedule_id: string (required) - The schedule to test notifications for
 * - status: 'completed' | 'failed' (optional, default: 'completed')
 * - result_text: string (optional) - Custom result/error message
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const body = await request.json()
    const { schedule_id, status = 'completed', result_text } = body

    if (!schedule_id) {
      return NextResponse.json({ error: 'schedule_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch schedule with agent data (workspace_id is on ai_agents, not agent_schedules)
    const { data: schedule, error: scheduleError } = await supabase
      .from('agent_schedules')
      .select('id, name, task_prompt, created_by, agent_id, ai_agent:ai_agents!agent_id(workspace_id)')
      .eq('id', schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found', details: scheduleError?.message }, { status: 404 })
    }

    // Extract workspace_id from the joined agent
    // Supabase returns joined data - handle both array and object forms
    const aiAgent = Array.isArray(schedule.ai_agent) ? schedule.ai_agent[0] : schedule.ai_agent
    const workspace_id = (aiAgent as { workspace_id: string | null } | null)?.workspace_id

    if (!workspace_id) {
      return NextResponse.json({
        error: 'Schedule agent has no workspace_id - notifications require a workspace',
        schedule: {
          id: schedule.id,
          name: schedule.name,
          agent_id: schedule.agent_id,
        }
      }, { status: 400 })
    }

    // Generate test result text
    const defaultResultText = status === 'completed'
      ? 'This is a test notification. The scheduled task completed successfully.'
      : 'This is a test notification. The scheduled task failed with a simulated error.'

    const finalResultText = result_text || defaultResultText

    // Send the notification
    const notificationResult = await sendScheduledTaskNotification({
      executionId: 'test-' + Date.now(),
      aiAgentId: schedule.agent_id,
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      taskPrompt: schedule.task_prompt,
      status: status as 'completed' | 'failed',
      resultText: finalResultText,
      durationMs: 1234, // Simulated duration
      workspaceId: workspace_id,
      scheduleCreatedBy: schedule.created_by,
      supabase,
    })

    return NextResponse.json({
      success: notificationResult.success,
      message: notificationResult.success
        ? `Test notification sent to ${notificationResult.recipientCount} recipient(s)`
        : 'Failed to send test notification',
      details: {
        schedule: {
          id: schedule.id,
          name: schedule.name,
          workspace_id,
          agent_id: schedule.agent_id,
          created_by: schedule.created_by,
        },
        notification: {
          status,
          resultText: finalResultText,
          recipientCount: notificationResult.recipientCount,
          errors: notificationResult.errors,
        },
      },
    })
  } catch (err) {
    console.error('Test notification error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/scheduled-tasks/test-notification?schedule_id=xxx
 *
 * Preview what would happen if we sent a notification for this schedule.
 * Does NOT send any notification - just shows the resolution details.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireSuperadmin()
    if (error) return error

    const scheduleId = request.nextUrl.searchParams.get('schedule_id')

    if (!scheduleId) {
      return NextResponse.json({ error: 'schedule_id query param is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch schedule with agent data (workspace_id is on ai_agents, not agent_schedules)
    const { data: schedule, error: scheduleError } = await supabase
      .from('agent_schedules')
      .select('id, name, task_prompt, created_by, agent_id, ai_agent:ai_agents!agent_id(workspace_id)')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Schedule not found', details: scheduleError?.message }, { status: 404 })
    }

    // Extract workspace_id from the joined agent
    // Supabase returns joined data - handle both array and object forms
    const aiAgent = Array.isArray(schedule.ai_agent) ? schedule.ai_agent[0] : schedule.ai_agent
    const workspace_id = (aiAgent as { workspace_id: string | null } | null)?.workspace_id

    const result: Record<string, unknown> = {
      schedule: {
        id: schedule.id,
        name: schedule.name,
        workspace_id,
        agent_id: schedule.agent_id,
        created_by: schedule.created_by,
        task_prompt: schedule.task_prompt?.slice(0, 100) + (schedule.task_prompt?.length > 100 ? '...' : ''),
      },
    }

    if (!workspace_id) {
      result.can_send_notification = false
      result.reason = 'Agent has no workspace_id'
      return NextResponse.json(result)
    }

    // Find local agent
    const { data: localAgent } = await supabase
      .from('agents')
      .select('id, name, reports_to, workspace_id')
      .eq('ai_agent_id', schedule.agent_id)
      .eq('workspace_id', workspace_id)
      .single()

    result.local_agent = localAgent ? {
      id: localAgent.id,
      name: localAgent.name,
      reports_to: localAgent.reports_to,
    } : null

    if (!localAgent) {
      result.can_send_notification = false
      result.reason = 'No local agent found for this ai_agent in the workspace'
      return NextResponse.json(result)
    }

    // Resolve recipients
    const recipients: Array<{ profile_id: string; source: string; name?: string }> = []

    // Check reports_to
    if (localAgent.reports_to) {
      const { data: reportsToProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', localAgent.reports_to)
        .single()

      recipients.push({
        profile_id: localAgent.reports_to,
        source: 'reports_to',
        name: reportsToProfile?.full_name || reportsToProfile?.email,
      })
    }

    // Check created_by (only if no reports_to)
    if (recipients.length === 0 && schedule.created_by) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', schedule.created_by)
        .single()

      recipients.push({
        profile_id: schedule.created_by,
        source: 'schedule_created_by',
        name: creatorProfile?.full_name || creatorProfile?.email,
      })
    }

    // Check workspace admins (only if still no recipients)
    if (recipients.length === 0) {
      const { data: admins } = await supabase
        .from('workspace_members')
        .select('profile_id, role, profile:profiles(full_name, email)')
        .eq('workspace_id', workspace_id)
        .in('role', ['owner', 'admin'])

      for (const admin of admins || []) {
        const profile = admin.profile as { full_name?: string; email?: string } | null
        recipients.push({
          profile_id: admin.profile_id,
          source: `workspace_${admin.role}`,
          name: profile?.full_name || profile?.email,
        })
      }
    }

    result.can_send_notification = recipients.length > 0
    result.recipients = recipients
    result.recipient_count = recipients.length

    if (recipients.length === 0) {
      result.reason = 'No recipients found (no reports_to, no created_by, no workspace admins)'
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Test notification preview error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
