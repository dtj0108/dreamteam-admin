import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/admin-auth'

export async function GET() {
  const { error } = await requireSuperadmin()
  if (error) return error

  const supabase = createAdminClient()

  // Get counts in parallel
  const [
    { count: totalUsers },
    { count: totalWorkspaces },
    { count: activeApiKeys },
    { data: recentSignups },
    { data: recentLogs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase
      .from('workspace_api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_revoked', false),
    supabase
      .from('profiles')
      .select('id, created_at')
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('admin_audit_logs')
      .select('id, action, target_type, created_at, admin:profiles!admin_audit_logs_admin_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    overview: {
      totalUsers: totalUsers || 0,
      totalWorkspaces: totalWorkspaces || 0,
      activeApiKeys: activeApiKeys || 0,
      newUsersLast30Days: recentSignups?.length || 0,
    },
    charts: {
      signupsByDay: aggregateByDay(recentSignups || []),
    },
    recentActivity: recentLogs || [],
  })
}

function aggregateByDay(items: { created_at: string }[]) {
  const counts: Record<string, number> = {}
  items.forEach((item) => {
    const day = item.created_at.split('T')[0]
    counts[day] = (counts[day] || 0) + 1
  })
  return Object.entries(counts).map(([date, count]) => ({ date, count }))
}
