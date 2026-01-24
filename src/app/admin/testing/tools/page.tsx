'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ToolTestRunner } from '@/components/admin/testing'
import { ArrowLeft, Wrench } from 'lucide-react'
import type { AgentTool } from '@/types/agents'

interface Workspace {
  id: string
  name: string
}

export default function ToolTestingPage() {
  const [tools, setTools] = useState<AgentTool[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [toolsRes, workspacesRes] = await Promise.all([
        fetch('/api/admin/agent-tools'),
        fetch('/api/admin/workspaces?limit=100')
      ])

      if (toolsRes.ok) {
        const data = await toolsRes.json()
        setTools(data.tools || [])
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
          <Wrench className="h-8 w-8" />
          Tool Testing
        </h1>
        <p className="text-muted-foreground">
          Validate schemas and execute MCP tools with real data
        </p>
      </div>

      <ToolTestRunner
        tools={tools}
        workspaces={workspaces}
        loading={loading}
      />
    </div>
  )
}
