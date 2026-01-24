'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AgentTestSandbox } from '@/components/admin/testing'
import { ArrowLeft, Bot } from 'lucide-react'
import type { Agent } from '@/types/agents'

interface Workspace {
  id: string
  name: string
}

export default function AgentTestingPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentsRes, workspacesRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/workspaces?limit=100')
      ])

      if (agentsRes.ok) {
        const data = await agentsRes.json()
        setAgents(data.agents || [])
      }

      if (workspacesRes.ok) {
        const data = await workspacesRes.json()
        setWorkspaces(data.workspaces || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
          <Bot className="h-8 w-8" />
          Agent Testing
        </h1>
        <p className="text-muted-foreground">
          Interactive chat testing sandbox for any agent
        </p>
      </div>

      <AgentTestSandbox
        agents={agents}
        workspaces={workspaces}
        loading={loading}
      />
    </div>
  )
}
