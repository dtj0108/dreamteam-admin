'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TestingStatsOverview,
  SystemHealthCard,
  QuickTestPanel,
  TestHistoryTable
} from '@/components/admin/testing'
import type { TestingStats, TestHistoryEntry } from '@/types/testing'
import { FlaskConical } from 'lucide-react'

export default function TestingHubPage() {
  const [stats, setStats] = useState<TestingStats | null>(null)
  const [history, setHistory] = useState<TestHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/admin/testing/stats'),
        fetch('/api/admin/testing/history?limit=10')
      ])

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setHistory(data.tests || [])
      }
    } catch (err) {
      console.error('Failed to fetch testing data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8" />
          Testing Hub
        </h1>
        <p className="text-muted-foreground">
          Consolidated testing suite for agents, tools, schedules, and providers
        </p>
      </div>

      <TestingStatsOverview stats={stats} loading={loading} />

      <QuickTestPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        <TestHistoryTable entries={history} loading={loading} limit={10} />
        <SystemHealthCard stats={stats} loading={loading} />
      </div>
    </div>
  )
}
