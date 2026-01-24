'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScheduleTestPanel } from '@/components/admin/schedule-test-panel'
import { CronValidator } from '@/components/admin/cron-validator'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'

interface Schedule {
  id: string
  name: string
  agent_id: string
  cron_expression: string
  timezone?: string
  is_enabled: boolean
  requires_approval: boolean
  task_prompt: string
  agent?: {
    id: string
    name: string
    is_enabled: boolean
    avatar_url: string | null
  }
}

export default function ScheduleTestingPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/schedules?enabled=true')
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
      }
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/testing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="h-8 w-8" />
          Schedule Testing
        </h1>
        <p className="text-muted-foreground">
          Run schedules on demand and test notifications
        </p>
      </div>

      {/* Cron Validator Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cron Expression Validator
          </CardTitle>
          <CardDescription>
            Validate and preview cron expressions before applying them to schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CronValidator />
        </CardContent>
      </Card>

      {/* Schedule Test Panel */}
      {loading ? (
        <Card>
          <CardHeader>
            <div className="animate-pulse h-6 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="animate-pulse h-20 w-full bg-muted rounded" />
          </CardContent>
        </Card>
      ) : schedules.length > 0 ? (
        <ScheduleTestPanel
          schedules={schedules}
          onRefresh={fetchSchedules}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Enabled Schedules</p>
            <p className="text-sm text-muted-foreground">
              Create and enable schedules to test them here
            </p>
            <Link href="/admin/scheduled-tasks">
              <Button variant="outline" className="mt-4">
                Go to Scheduled Tasks
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
