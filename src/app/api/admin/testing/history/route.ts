import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TestHistoryEntry } from '@/types/testing'

// GET /api/admin/testing/history - Get recent test history across all types
export async function GET(request: NextRequest) {
  const { error } = await requireSuperadmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const type = searchParams.get('type') // optional filter

  const supabase = createAdminClient()
  const tests: TestHistoryEntry[] = []

  // Fetch agent test sessions
  if (!type || type === 'agent') {
    const { data: sessions } = await supabase
      .from('agent_test_sessions')
      .select(`
        id,
        agent_id,
        status,
        started_at,
        ended_at,
        total_turns,
        agent:ai_agents!agent_test_sessions_agent_id_fkey(name)
      `)
      .order('started_at', { ascending: false })
      .limit(limit)

    sessions?.forEach(session => {
      const duration = session.ended_at
        ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
        : 0

      // Handle Supabase's join format (can be object or array)
      const agentData = session.agent
      const agentName = Array.isArray(agentData)
        ? agentData[0]?.name
        : (agentData as { name?: string } | null)?.name

      tests.push({
        id: session.id,
        type: 'agent',
        target_id: session.agent_id,
        target_name: agentName || 'Unknown Agent',
        success: session.status === 'completed',
        duration_ms: duration,
        metadata: { turns: session.total_turns },
        created_at: session.started_at
      })
    })
  }

  // Fetch schedule executions (as schedule tests)
  if (!type || type === 'schedule') {
    const { data: executions } = await supabase
      .from('agent_schedule_executions')
      .select(`
        id,
        schedule_id,
        status,
        duration_ms,
        started_at,
        error_message,
        schedule:agent_schedules!agent_schedule_executions_schedule_id_fkey(name)
      `)
      .in('status', ['completed', 'failed'])
      .order('started_at', { ascending: false })
      .limit(limit)

    executions?.forEach(exec => {
      // Handle Supabase's join format (can be object or array)
      const scheduleData = exec.schedule
      const scheduleName = Array.isArray(scheduleData)
        ? scheduleData[0]?.name
        : (scheduleData as { name?: string } | null)?.name

      tests.push({
        id: exec.id,
        type: 'schedule',
        target_id: exec.schedule_id,
        target_name: scheduleName || 'Unknown Schedule',
        success: exec.status === 'completed',
        duration_ms: exec.duration_ms || 0,
        error: exec.error_message || undefined,
        created_at: exec.started_at || new Date().toISOString()
      })
    })
  }

  // Sort all tests by created_at descending and limit
  tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const limitedTests = tests.slice(0, limit)

  return NextResponse.json({
    tests: limitedTests,
    total: limitedTests.length
  })
}
