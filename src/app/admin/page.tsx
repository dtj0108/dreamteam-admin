import { Users, Building2, Key, TrendingUp, Activity } from 'lucide-react'
import { StatsCard } from '@/components/admin/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDistanceToNow } from 'date-fns'

async function getAnalytics() {
  const supabase = createAdminClient()

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
      ),
    supabase
      .from('admin_audit_logs')
      .select('id, action, target_type, created_at, admin:profiles!admin_audit_logs_admin_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return {
    overview: {
      totalUsers: totalUsers || 0,
      totalWorkspaces: totalWorkspaces || 0,
      activeApiKeys: activeApiKeys || 0,
      newUsersLast30Days: recentSignups?.length || 0,
    },
    recentActivity: recentLogs || [],
  }
}

export default async function AdminDashboard() {
  const { overview, recentActivity } = await getAnalytics()

  const stats = [
    {
      label: 'Total Users',
      value: overview.totalUsers,
      icon: Users,
      description: 'Registered accounts'
    },
    {
      label: 'Workspaces',
      value: overview.totalWorkspaces,
      icon: Building2,
      description: 'Active workspaces'
    },
    {
      label: 'Active API Keys',
      value: overview.activeApiKeys,
      icon: Key,
      description: 'Non-revoked keys'
    },
    {
      label: 'New Users (30d)',
      value: overview.newUsersLast30Days,
      icon: TrendingUp,
      description: 'Last 30 days'
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and recent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.label}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {recentActivity.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.target_type} • by {log.admin?.email || 'Unknown'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
