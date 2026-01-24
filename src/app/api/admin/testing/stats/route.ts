import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TestingStats } from '@/types/testing'

// GET /api/admin/testing/stats - Get aggregated testing statistics
export async function GET() {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString()

  // Active test sessions
  const { count: activeSessions } = await supabase
    .from('agent_test_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Tests today (schedule executions)
  const { count: testsToday } = await supabase
    .from('agent_schedule_executions')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', startOfDay)

  // Pass rate in 24h (based on schedule executions)
  const { data: recentExecutions } = await supabase
    .from('agent_schedule_executions')
    .select('status')
    .gte('completed_at', twentyFourHoursAgo)
    .in('status', ['completed', 'failed'])

  const completedCount = recentExecutions?.filter(e => e.status === 'completed').length || 0
  const failedCount = recentExecutions?.filter(e => e.status === 'failed').length || 0
  const totalExecutions = completedCount + failedCount
  const passRate24h = totalExecutions > 0 ? Math.round((completedCount / totalExecutions) * 100) : 100

  // Tool health (enabled vs total)
  const { count: totalTools } = await supabase
    .from('agent_tools')
    .select('*', { count: 'exact', head: true })

  const { count: enabledTools } = await supabase
    .from('agent_tools')
    .select('*', { count: 'exact', head: true })
    .eq('is_enabled', true)

  // Schedule health (enabled schedules)
  const { count: totalSchedules } = await supabase
    .from('agent_schedules')
    .select('*', { count: 'exact', head: true })

  const { count: enabledSchedules } = await supabase
    .from('agent_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('is_enabled', true)

  // Provider status (check if API keys are configured)
  const { data: providers } = await supabase
    .from('model_provider_configs')
    .select('provider, has_api_key, is_enabled')

  const providerStatus = {
    anthropic: providers?.some(p => p.provider === 'anthropic' && p.has_api_key && p.is_enabled) || false,
    xai: providers?.some(p => p.provider === 'xai' && p.has_api_key && p.is_enabled) || false
  }

  const stats: TestingStats = {
    active_sessions: activeSessions || 0,
    tests_today: testsToday || 0,
    pass_rate_24h: passRate24h,
    tool_health: {
      total: totalTools || 0,
      passing: enabledTools || 0
    },
    schedule_health: {
      total: totalSchedules || 0,
      passing: enabledSchedules || 0
    },
    provider_status: providerStatus
  }

  return NextResponse.json({ stats })
}
