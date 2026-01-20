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
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, CreditCard, Settings, Trash2, Users } from 'lucide-react'
import type { PlanWithTeam } from '@/types/teams'

interface Team {
  id: string
  name: string
  slug: string
}

function formatPrice(cents: number | null): string {
  if (cents === null || cents === undefined) return '-'
  return `$${(cents / 100).toFixed(2)}`
}

export default function PlansPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithTeam[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTeamId, setNewTeamId] = useState('')
  const [newPriceMonthly, setNewPriceMonthly] = useState('')
  const [newPriceYearly, setNewPriceYearly] = useState('')

  const fetchPlans = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await fetch('/api/admin/plans')
      const data = await res.json()

      if (res.ok) {
        setPlans(data.plans || [])
      } else {
        setFetchError(data.error || `Failed to fetch plans (${res.status})`)
      }
    } catch {
      setFetchError('Network error - please refresh the page')
    }
    setLoading(false)
  }, [])

  const fetchTeams = useCallback(async () => {
    const res = await fetch('/api/admin/teams?active_only=true')
    if (res.ok) {
      const data = await res.json()
      setTeams(data.teams || [])
    }
  }, [])

  useEffect(() => {
    fetchPlans()
    fetchTeams()
  }, [fetchPlans, fetchTeams])

  async function handleToggleActive(plan: PlanWithTeam) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !plan.is_active })
    })

    if (res.ok) {
      fetchPlans()
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          slug: newSlug || undefined,
          description: newDescription || null,
          team_id: newTeamId || null,
          price_monthly: newPriceMonthly ? Math.round(parseFloat(newPriceMonthly) * 100) : null,
          price_yearly: newPriceYearly ? Math.round(parseFloat(newPriceYearly) * 100) : null
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCreateOpen(false)
        setNewName('')
        setNewSlug('')
        setNewDescription('')
        setNewTeamId('')
        setNewPriceMonthly('')
        setNewPriceYearly('')
        router.push(`/admin/plans/${data.plan.id}`)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        setCreateError(errorData.error || `Failed to create plan (${res.status})`)
      }
    } catch {
      setCreateError('Network error - please try again')
    }

    setCreating(false)
  }

  async function handleDelete(plan: PlanWithTeam) {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"?`)) return

    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      fetchPlans()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to delete plan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Manage subscription plans and assign teams</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a subscription plan and assign a team of agents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Starter"
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
                  placeholder="Brief description of this plan"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={newTeamId || '_none'} onValueChange={(v) => setNewTeamId(v === '_none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No team</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                  <Input
                    id="priceMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPriceMonthly}
                    onChange={e => setNewPriceMonthly(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                  <Input
                    id="priceYearly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPriceYearly}
                    onChange={e => setNewPriceYearly(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
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
                {creating ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plans with Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.team_id).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <div className="text-destructive font-medium">Error loading plans:</div>
            <div className="text-sm text-destructive/80">{fetchError}</div>
            <Button variant="outline" size="sm" onClick={fetchPlans} className="ml-auto">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Plans Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Yearly</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No plans configured yet. Click &quot;Create Plan&quot; to get started.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/plans/${plan.id}`)}>
                  <TableCell>
                    <div className="font-medium">{plan.name}</div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {plan.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{plan.slug}</Badge>
                  </TableCell>
                  <TableCell>
                    {plan.team ? (
                      <Badge variant="secondary">{plan.team.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatPrice(plan.price_monthly)}</TableCell>
                  <TableCell>{formatPrice(plan.price_yearly)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => handleToggleActive(plan)}
                    />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/admin/plans/${plan.id}`)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
