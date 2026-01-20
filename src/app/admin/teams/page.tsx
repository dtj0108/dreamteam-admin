'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Plus, Users, Settings, Bot, Trash2 } from 'lucide-react'
import type { TeamWithRelations } from '@/types/teams'

export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const fetchTeams = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await fetch('/api/admin/teams')
      const data = await res.json()

      if (res.ok) {
        setTeams(data.teams || [])
      } else {
        setFetchError(data.error || `Failed to fetch teams (${res.status})`)
      }
    } catch {
      setFetchError('Network error - please refresh the page')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  async function handleToggleActive(team: TeamWithRelations) {
    const res = await fetch(`/api/admin/teams/${team.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !team.is_active })
    })

    if (res.ok) {
      fetchTeams()
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          slug: newSlug || undefined,
          description: newDescription || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCreateOpen(false)
        setNewName('')
        setNewSlug('')
        setNewDescription('')
        router.push(`/admin/teams/${data.team.id}`)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(errorData.error || `Failed to create team (${res.status})`)
      }
    } catch {
      setCreateError('Network error - please try again')
    }

    setCreating(false)
  }

  async function handleDelete(team: TeamWithRelations) {
    if (!confirm(`Are you sure you want to delete the team "${team.name}"?`)) return

    const res = await fetch(`/api/admin/teams/${team.id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      fetchTeams()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete team')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Compose agents into teams for subscription plans</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to group agents together for a subscription plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Starter Team"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (optional)</Label>
                <Input
                  id="slug"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                  placeholder="auto-generated-from-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief description of this team"
                  rows={2}
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
                {creating ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Agents in Teams</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams.reduce((sum, t) => sum + (t.agent_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-destructive font-medium">Error loading teams:</div>
            <div className="text-sm text-destructive/80">{fetchError}</div>
            <Button variant="outline" size="sm" onClick={fetchTeams} className="ml-auto">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No teams configured yet. Create a team to get started.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${!team.is_active ? 'opacity-60' : ''}`}
              onClick={() => router.push(`/admin/teams/${team.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {team.name}
                      {!team.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {team.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={team.is_active}
                      onCheckedChange={() => handleToggleActive(team)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Bot className="h-4 w-4" />
                      <span>{team.agent_count || 0} agents</span>
                    </div>
                    {team.head_agent && (
                      <Badge variant="outline" className="text-xs">
                        Lead: {team.head_agent.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/teams/${team.id}`)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(team)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
