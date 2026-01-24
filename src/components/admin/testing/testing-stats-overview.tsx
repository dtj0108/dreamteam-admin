'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bot,
  Wrench,
  Calendar,
  Cpu,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react'
import type { TestingStats } from '@/types/testing'

interface TestingStatsOverviewProps {
  stats: TestingStats | null
  loading?: boolean
}

export function TestingStatsOverview({ stats, loading }: TestingStatsOverviewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const passRateColor = stats.pass_rate_24h >= 90
    ? 'text-green-600'
    : stats.pass_rate_24h >= 70
      ? 'text-yellow-600'
      : 'text-red-600'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Sessions
          </CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_sessions}</div>
          <p className="text-xs text-muted-foreground">
            agent test sessions running
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tests Today
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.tests_today}</div>
          <p className="text-xs text-muted-foreground">
            executions run today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pass Rate (24h)
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${passRateColor}`}>
            {stats.pass_rate_24h}%
          </div>
          <p className="text-xs text-muted-foreground">
            successful executions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tool Health
          </CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.tool_health.passing}/{stats.tool_health.total}
          </div>
          <p className="text-xs text-muted-foreground">
            tools enabled
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SystemHealthCard({ stats, loading }: TestingStatsOverviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Badge
            variant="outline"
            className={stats.provider_status.anthropic
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
            }
          >
            {stats.provider_status.anthropic ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            Anthropic
          </Badge>
          <Badge
            variant="outline"
            className={stats.provider_status.xai
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
            }
          >
            {stats.provider_status.xai ? (
              <CheckCircle className="mr-1 h-3 w-3" />
            ) : (
              <XCircle className="mr-1 h-3 w-3" />
            )}
            xAI
          </Badge>
          <Badge
            variant="outline"
            className={stats.schedule_health.passing > 0
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }
          >
            <Calendar className="mr-1 h-3 w-3" />
            {stats.schedule_health.passing} Schedules Active
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
