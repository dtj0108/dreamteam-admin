'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Bot, Wrench, Plug, Users } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
  model: string
  is_enabled: boolean
  is_head: boolean
  created_at: string
  department?: {
    id: string
    name: string
  } | null
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/admin/agents')
    if (res.ok) {
      const data = await res.json()
      setAgents(data.agents || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  async function handleToggleEnabled(agent: Agent) {
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !agent.is_enabled })
    })

    if (res.ok) {
      fetchAgents()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">Configure and manage AI agents</p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.is_enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Department Heads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.is_head).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Full agent builder in Sprint 3</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">Agent Builder Coming Soon</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              The full agent builder with system prompt editor, tool assignment, and sandbox testing is coming in Sprint 3.
              For now, you can manage <a href="/admin/tools" className="underline">Tools</a> and{' '}
              <a href="/admin/mcp" className="underline">MCP Integrations</a>.
            </p>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No agents configured yet. Agent creation coming in Sprint 3.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{agent.name}</span>
                      {agent.is_head && (
                        <Badge variant="secondary" className="text-xs">Head</Badge>
                      )}
                    </div>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {agent.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.department?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{agent.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_enabled ? 'default' : 'secondary'}>
                      {agent.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(agent.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={agent.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(agent)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
