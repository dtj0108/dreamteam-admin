'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Bot, Users, Settings } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string | null
  model: string
  is_enabled: boolean
  is_head: boolean
  current_version: number
  published_version: number | null
  created_at: string
  department?: {
    id: string
    name: string
    icon?: string
  } | null
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newModel, setNewModel] = useState('sonnet')
  const [newPrompt, setNewPrompt] = useState('You are a helpful AI assistant.')

  const fetchAgents = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await fetch('/api/admin/agents')
      const data = await res.json()

      if (res.ok) {
        setAgents(data.agents || [])
      } else {
        setFetchError(data.error || `Failed to fetch agents (${res.status})`)
      }
    } catch {
      setFetchError('Network error - please refresh the page')
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

  async function handleCreate() {
    if (!newName.trim() || !newPrompt.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription || null,
          model: newModel,
          system_prompt: newPrompt
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCreateOpen(false)
        setNewName('')
        setNewDescription('')
        setNewModel('sonnet')
        setNewPrompt('You are a helpful AI assistant.')
        router.push(`/admin/agents/${data.agent.id}`)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(errorData.error || `Failed to create agent (${res.status})`)
      }
    } catch {
      setCreateError('Network error - please try again')
    }

    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">Configure and manage AI agents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Create a new AI agent and configure it in the Agent Builder
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Sales Assistant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief description of the agent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select value={newModel} onValueChange={setNewModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haiku">Claude Haiku 4.5 (Fast)</SelectItem>
                    <SelectItem value="sonnet">Claude Sonnet 4.5 (Balanced)</SelectItem>
                    <SelectItem value="opus">Claude Opus 4.5 (Most Capable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Initial System Prompt</Label>
                <Textarea
                  id="prompt"
                  value={newPrompt}
                  onChange={e => setNewPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {createError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateError(null) }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter(a => a.published_version !== null).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-destructive font-medium">Error loading agents:</div>
            <div className="text-sm text-destructive/80">{fetchError}</div>
            <Button variant="outline" size="sm" onClick={fetchAgents} className="ml-auto">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-start gap-3">
          <Bot className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-100">Agent Builder Available</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Create and configure AI agents with the full Agent Builder. Assign tools, skills, define rules, and test your agents in a sandbox before publishing.
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
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Actions</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No agents configured yet. Click &quot;Create Agent&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow key={agent.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/agents/${agent.id}`)}>
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
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">v{agent.current_version || 1}</Badge>
                      {agent.published_version && (
                        <Badge variant="default" className="text-xs">Published</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_enabled ? 'default' : 'secondary'}>
                      {agent.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={agent.is_enabled}
                      onCheckedChange={() => handleToggleEnabled(agent)}
                    />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/agents/${agent.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configure
                    </Button>
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
